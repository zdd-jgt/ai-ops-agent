import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { TelemetryBatchV1Schema } from "@ai-ops/telemetry-contracts";
import type { TelemetryBatchV1, TelemetryEventV1, TenantScopedTelemetryEventV1 } from "@ai-ops/telemetry-contracts";
import { AuthError } from "@ai-ops/auth-contracts";
import { structuredLog } from "../lib/response.js";
import { store } from "../lib/store.js";
import { normalizeEvent, deduplicateBatch, containsForbiddenPattern } from "../cleaner/index.js";
import { RateLimiter } from "../policy/ratelimit.js";
import { createWriteKeyRegistry } from "../policy/write-key.js";
import type { Sink } from "../sinks/types.js";

// ---- Pipeline Factory ----

const rateLimitMax = Number(process.env["RATE_LIMIT_MAX"]) || 10_000;
const rateLimiter = new RateLimiter(rateLimitMax, 60_000);

export function createIngestRouter(sink: Sink): Hono {
  const ingest = new Hono();
  const writeKeys = createWriteKeyRegistry(process.env["TELEMETRY_WRITE_KEYS_JSON"]);

  ingest.post(
    "/v1/telemetry/batches",
    zValidator("json", TelemetryBatchV1Schema, (result, c) => {
      if (!result.success) {
        structuredLog("warn", "schema validation failed");
        return c.json(
          {
            accepted: 0,
            rejected: 1,
            results: [
              { index: 0, event_id: "unknown", status: "INVALID_SCHEMA" as const,
                detail: result.error.issues[0]?.message ?? "" },
            ],
          },
          422,
        );
      }
    }),
    async (c) => {
      const batch = c.req.valid("json") as TelemetryBatchV1;
      const writeKey = c.req.header("X-Telemetry-Write-Key") ?? c.req.query("writeKey") ?? "";

      let scope;
      try {
        scope = writeKeys.authorize(writeKey, {
          appIds: [...new Set(batch.events.map((event) => event.app_id))],
          environments: [...new Set(batch.events.map((event) => event.environment))],
          origin: c.req.header("Origin"),
        });
      } catch (error) {
        const status = error instanceof AuthError && error.code === "FORBIDDEN" ? 403 : 401;
        structuredLog("warn", "telemetry authorization rejected", { status });
        return c.json(
          { accepted: 0, rejected: batch.events.length,
            results: batch.events.map((_, i) => ({ index: i, event_id: "unknown", status: "FORBIDDEN" as const })) },
          status,
        );
      }

      // Rate limit by server-derived scope, not caller-controlled key text.
      if (!rateLimiter.allow(`${scope.tenantId}:${scope.appId}`)) {
        structuredLog("warn", "rate limited");
        return c.json(
          { accepted: 0, rejected: batch.events.length,
            results: batch.events.map((_, i) => ({ index: i, event_id: "unknown", status: "RATE_LIMITED" as const })) },
          429,
        );
      }

      // Dedup
      const dedup = deduplicateBatch(batch.events);

      // Normalize + sanitize + validate
      let accepted = 0;
      let rejected = 0;
      const acceptedEvents: TenantScopedTelemetryEventV1[] = [];
      const results: Array<{ index: number; event_id: string; status: string; detail?: string }> = [];

      for (let i = 0; i < dedup.events.length; i++) {
        const event = dedup.events[i]!;
        const originalIndex = dedup.originalIndices[i]!;

        if (hasForbiddenContent(event)) {
          rejected++;
          results.push({ index: originalIndex, event_id: event.event_id, status: "INVALID_SCHEMA", detail: "forbidden content" });
          continue;
        }

        const norm = normalizeEvent(event);
        const issues = validateEvent(norm.event);
        if (issues.length > 0) {
          rejected++;
          results.push({ index: originalIndex, event_id: event.event_id, status: "INVALID_SCHEMA", detail: issues.join("; ") });
        } else {
          accepted++;
          acceptedEvents.push({
            ...norm.event,
            tenant_id: scope.tenantId,
            received_at: new Date().toISOString(),
            ingest_id: crypto.randomUUID(),
          });
          results.push({ index: originalIndex, event_id: event.event_id, status: "OK" });
        }
      }

      // Mark duplicates
      for (let i = 0; i < batch.events.length; i++) {
        if (!results.some((r) => r.index === i)) {
          results.push({ index: i, event_id: batch.events[i]!.event_id, status: "INVALID_SCHEMA", detail: "duplicate" });
          rejected++;
        }
      }
      results.sort((a, b) => a.index - b.index);

      // Write accepted events to sink + store
      if (acceptedEvents.length > 0) {
        try {
          store.write(acceptedEvents);
        } catch (err) {
          structuredLog("error", "store write failed", { message: String(err) });
        }
        try {
          if (sink.writeBatch) {
            sink.writeBatch(acceptedEvents);
          } else {
            for (const event of acceptedEvents) {
              sink.write(event);
            }
          }
        } catch (err) {
          structuredLog("error", "sink write failed", { message: String(err) });
        }
      }

      structuredLog("info", "batch processed", {
        batchSize: batch.events.length,
        accepted,
        rejected,
        duplicates: dedup.duplicatesRemoved,
        tenantId: scope.tenantId,
        appId: scope.appId,
      });

      return c.json({ accepted, rejected, results }, accepted === 0 && rejected > 0 ? 422 : 200);
    },
  );

  return ingest;
}

// ---- Helpers ----

function hasForbiddenContent(event: TelemetryEventV1): boolean {
  if ("message" in event && typeof event.message === "string") {
    if (containsForbiddenPattern(event.message as string)) return true;
  }
  if ("attributes" in event && event["attributes"]) {
    const attrs = event["attributes"] as Record<string, unknown>;
    for (const value of Object.values(attrs)) {
      if (typeof value === "string" && containsForbiddenPattern(value)) return true;
    }
  }
  return false;
}

function validateEvent(event: TelemetryEventV1): string[] {
  const issues: string[] = [];
  if (isNaN(Date.parse(event.timestamp))) issues.push("invalid timestamp");
  if (event.schema_version !== "1.0.0") issues.push("bad schema_version");
  if (event.route.length > 256) issues.push("route too long");
  if (!event.app_id.trim()) issues.push("empty app_id");
  if (!event.environment.trim()) issues.push("empty environment");
  if (!event.release.trim()) issues.push("empty release");
  return issues;
}
