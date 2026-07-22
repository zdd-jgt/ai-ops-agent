import { describe, expect, it } from "vitest";
import app from "../src/index.js";
const AUTH_HEADERS = { Authorization: "Bearer test-query-token" };


function event(id: string, message: string) {
  return {
    schema_version: "1.0.0",
    event_id: id,
    event_type: "frontend_log",
    timestamp: new Date().toISOString(),
    app_id: "review-app",
    environment: "staging",
    release: "v1",
    route: "/review",
    session_id: "session",
    page_url: "https://example.test/review",
    sdk_version: "0.1.0",
    level: "info",
    message,
  };
}

function batch(events: ReturnType<typeof event>[]) {
  return {
    schema_version: "1.0.0",
    sdk: { name: "review", version: "0.1.0" },
    sent_at: new Date().toISOString(),
    events,
  };
}

async function ingest(body: unknown, suffix = "") {
  return app.request(`/v1/telemetry/batches${suffix}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("review regression fixes", () => {
  it("accepts the public write key used by Beacon query parameters", async () => {
    const response = await ingest(
      batch([event(crypto.randomUUID(), "beacon")]),
      "?writeKey=pub_beacon",
    );
    expect(response.status).toBe(200);
  });

  it("preserves original result indexes after deduplication", async () => {
    const first = event(crypto.randomUUID(), "duplicate");
    const duplicate = { ...first };
    const third = event(crypto.randomUUID(), "unique");
    const response = await ingest(batch([first, duplicate, third]), "?writeKey=pub_dedup");
    const body = await response.json();

    expect(body.results).toEqual([
      expect.objectContaining({ index: 0, event_id: first.event_id, status: "OK" }),
      expect.objectContaining({ index: 1, event_id: duplicate.event_id, detail: "duplicate" }),
      expect.objectContaining({ index: 2, event_id: third.event_id, status: "OK" }),
    ]);
  });

  it("returns Evidence only inside the requested app scope", async () => {
    const evidence = event(crypto.randomUUID(), "scoped evidence");
    expect((await ingest(batch([evidence]), "?writeKey=pub_evidence")).status).toBe(200);

    const found = await app.request(`/v1/query/logs/evidence?id=${evidence.event_id}&appId=review-app`, { headers: AUTH_HEADERS });
    expect(found.status).toBe(200);
    const foundBody = await found.json();
    expect(foundBody.eventId).toBe(evidence.event_id);
    expect(foundBody.tenantId).toBe("test-tenant");

    const denied = await app.request(`/v1/query/logs/evidence?id=${evidence.event_id}&appId=other-app`, { headers: AUTH_HEADERS });
    expect(denied.status).toBe(403);

    const crossTenant = await app.request(`/v1/query/logs/evidence?id=${evidence.event_id}&appId=review-app`, {
      headers: { Authorization: "Bearer other-tenant-token" },
    });
    expect(crossTenant.status).toBe(404);
  });

  it("enforces environment and release scope for logs and Evidence", async () => {
    const scoped = { ...event(crypto.randomUUID(), "release scoped"), environment: "production", release: "v2" };
    expect((await ingest(batch([scoped]), "?writeKey=pub_scope")).status).toBe(200);
    const now = Date.now();
    const base = `/v1/query/logs/search?start=${encodeURIComponent(new Date(now - 60_000).toISOString())}&end=${encodeURIComponent(new Date(now + 60_000).toISOString())}&appId=review-app`;

    const allowed = await app.request(`${base}&environment=production&release=v2&route=/review`, { headers: AUTH_HEADERS });
    expect((await allowed.json()).items).toEqual(expect.arrayContaining([
      expect.objectContaining({ evidenceId: scoped.event_id }),
    ]));

    const denied = await app.request(`${base}&environment=staging&release=v1&route=/review`, { headers: AUTH_HEADERS });
    expect((await denied.json()).items).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ evidenceId: scoped.event_id }),
    ]));

    const deniedEvidence = await app.request(`/v1/query/logs/evidence?id=${scoped.event_id}&appId=review-app&environment=production&release=v1`, { headers: AUTH_HEADERS });
    expect(deniedEvidence.status).toBe(404);
  });
});
