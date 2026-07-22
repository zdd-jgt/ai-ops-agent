import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { store } from "../lib/store.js";
import { authorizeScope } from "@ai-ops/auth-contracts";
import { authenticateRequest } from "../policy/auth.js";
import { structuredLog } from "../lib/response.js";
import type {
  PerformanceOverview,
  PageStatsResult,
  LogSearchResult,
  LogEntry,
} from "./templates.js";

const query = new Hono();

function authorizeQuery(authorization: string | undefined, appId: string, environment?: string) {
  const principal = authenticateRequest(authorization);
  authorizeScope(principal, {
    appId,
    ...(environment ? { environment } : {}),
  });
  return principal;
}

/** 计算 p75 分位数 */
function p75(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil(sorted.length * 0.75) - 1;
  return sorted[idx]!;
}

/** 从事件中提取消息 */
function getMessage(event: Record<string, unknown>): string {
  if (typeof event["message"] === "string") return event["message"];
  if (typeof event["stack"] === "string") return event["stack"].slice(0, 200);
  return `${event["event_type"] ?? "unknown"}`;
}

/** 从事件中提取日志级别 */
function getLevel(event: Record<string, unknown>): string {
  return typeof event["level"] === "string" ? event["level"] : "info";
}

// ---- Performance Overview ----

query.get(
  "/v1/query/performance/overview",
  zValidator("query", z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
    appId: z.string().min(1).max(128),
    environment: z.string().min(1).max(64).optional(),
    release: z.string().min(1).max(128).optional(),
    route: z.string().max(256).optional(),
    limit: z.coerce.number().int().min(1).max(500).optional().default(100),
  })),
  (c) => {
    const p = c.req.valid("query");
    const rangeDays = (Date.parse(p.end) - Date.parse(p.start)) / 86400000;
    const principal = authorizeQuery(c.req.header("Authorization"), p.appId, p.environment);
    if (rangeDays > 30) return c.json({ error: "time range exceeds 30 days" }, 400);

    const events = store.query({
      appId: p.appId,
      tenantId: principal.tenantId,
      start: p.start,
      end: p.end,
      ...(p.environment ? { environment: p.environment } : {}),
      ...(p.release ? { release: p.release } : {}),
    });
    const vitals = events.filter((event) => {
      if (event.event_type !== "web_vital") return false;
      return !p.route || (event as Record<string, unknown>)["route"] === p.route;
    });

    const lcpValues: number[] = [];
    const inpValues: number[] = [];
    const clsValues: number[] = [];
    const fcpValues: number[] = [];
    const ttfbValues: number[] = [];

    for (const e of vitals) {
      const v = e as Record<string, unknown>;
      if (v["vital_type"] === "LCP" && typeof v["value"] === "number") lcpValues.push(v["value"]);
      if (v["vital_type"] === "INP" && typeof v["value"] === "number") inpValues.push(v["value"]);
      if (v["vital_type"] === "CLS" && typeof v["value"] === "number") clsValues.push(v["value"]);
      if (v["vital_type"] === "FCP" && typeof v["value"] === "number") fcpValues.push(v["value"]);
      if (v["vital_type"] === "TTFB" && typeof v["value"] === "number") ttfbValues.push(v["value"]);
    }

    const result: PerformanceOverview = {
      queryStatus: "complete",
      tenantId: principal.tenantId,
      timeRange: { start: p.start, end: p.end },
      sampleCount: vitals.length,
      p75: {
        lcp: p75(lcpValues),
        inp: p75(inpValues),
        cls: p75(clsValues),
        fcp: p75(fcpValues),
        ttfb: p75(ttfbValues),
      },
      evidenceIds: vitals.slice(0, p.limit).map((event) => event.event_id),
      generatedAt: new Date().toISOString(),
    };

    return c.json(result);
  },
);

// ---- Page Stats ----

query.get(
  "/v1/query/performance/pages",
  zValidator("query", z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
    appId: z.string().min(1).max(128),
    environment: z.string().min(1).max(64).optional(),
    release: z.string().min(1).max(128).optional(),
    route: z.string().max(256).optional(),
    limit: z.coerce.number().int().min(1).max(500).optional().default(100),
  })),
  (c) => {
    const p = c.req.valid("query");
    const rangeDays = (Date.parse(p.end) - Date.parse(p.start)) / 86400000;
    const principal = authorizeQuery(c.req.header("Authorization"), p.appId, p.environment);
    if (rangeDays > 30) return c.json({ error: "time range exceeds 30 days" }, 400);

    const events = store.query({
      appId: p.appId,
      tenantId: principal.tenantId,
      start: p.start,
      end: p.end,
      ...(p.environment ? { environment: p.environment } : {}),
      ...(p.release ? { release: p.release } : {}),
    });
    const vitals = events.filter((event) => {
      if (event.event_type !== "web_vital") return false;
      return !p.route || (event as Record<string, unknown>)["route"] === p.route;
    });
    const errors = events.filter((e) => e.event_type === "frontend_error");

    // 按路由分组
    const routeMap = new Map<string, { lcp: number[]; inp: number[]; cls: number[]; fcp: number[]; ttfb: number[]; errors: number }>();
    for (const e of vitals) {
      const v = e as Record<string, unknown>;
      const route = typeof v["route"] === "string" ? v["route"] : "/";
      if (!routeMap.has(route)) routeMap.set(route, { lcp: [], inp: [], cls: [], fcp: [], ttfb: [], errors: 0 });
      const r = routeMap.get(route)!;
      if (v["vital_type"] === "LCP" && typeof v["value"] === "number") r.lcp.push(v["value"]);
      if (v["vital_type"] === "INP" && typeof v["value"] === "number") r.inp.push(v["value"]);
      if (v["vital_type"] === "CLS" && typeof v["value"] === "number") r.cls.push(v["value"]);
      if (v["vital_type"] === "FCP" && typeof v["value"] === "number") r.fcp.push(v["value"]);
      if (v["vital_type"] === "TTFB" && typeof v["value"] === "number") r.ttfb.push(v["value"]);
    }
    for (const e of errors) {
      const v = e as Record<string, unknown>;
      const route = typeof v["route"] === "string" ? v["route"] : "/";
      if (routeMap.has(route)) routeMap.get(route)!.errors++;
    }

    const pages = [...routeMap.entries()]
      .filter(([route]) => !p.route || route === p.route)
      .map(([route, r]) => ({
        route,
        samples: r.lcp.length + r.inp.length + r.cls.length + r.fcp.length + r.ttfb.length,
        p75: { lcp: p75(r.lcp), inp: p75(r.inp), cls: p75(r.cls), fcp: p75(r.fcp), ttfb: p75(r.ttfb) },
        errorCount: r.errors,
      }))
      .sort((a, b) => b.samples - a.samples)
      .slice(0, p.limit);

    const returnedRoutes = new Set(pages.map((page) => page.route));
    const evidenceIds = [...vitals, ...errors]
      .filter((event) => returnedRoutes.has(String((event as Record<string, unknown>)["route"] ?? "/")))
      .map((event) => event.event_id)
      .slice(0, 100);

    return c.json({
      queryStatus: "complete" as const,
      tenantId: principal.tenantId,
      timeRange: { start: p.start, end: p.end },
      pages,
      evidenceIds,
      truncated: routeMap.size > pages.length || evidenceIds.length === 100,
      generatedAt: new Date().toISOString(),
    } satisfies PageStatsResult);
  },
);

// ---- Log Search ----

query.get(
  "/v1/query/logs/search",
  zValidator("query", z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
    appId: z.string().min(1).max(128),
    environment: z.string().min(1).max(64).optional(),
    release: z.string().min(1).max(128).optional(),
    route: z.string().max(256).optional(),
    level: z.enum(["debug", "info", "warn", "error"]).optional(),
    messageContains: z.string().max(200).optional(),
    cursor: z.string().max(256).optional(),
    limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  })),
  (c) => {
    const p = c.req.valid("query");
    const rangeDays = (Date.parse(p.end) - Date.parse(p.start)) / 86400000;
    const principal = authorizeQuery(c.req.header("Authorization"), p.appId, p.environment);
    if (rangeDays > 30) return c.json({ error: "time range exceeds 30 days" }, 400);

    const events = store.query({
      appId: p.appId,
      tenantId: principal.tenantId,
      start: p.start,
      end: p.end,
      ...(p.environment ? { environment: p.environment } : {}),
      ...(p.release ? { release: p.release } : {}),
    });
    const logsAndErrors = events.filter((e) => {
      if (e.event_type !== "frontend_log" && e.event_type !== "frontend_error") return false;
      return !p.route || (e as Record<string, unknown>)["route"] === p.route;
    });

    let items: LogEntry[] = logsAndErrors.map((e) => {
      const v = e as Record<string, unknown>;
      return {
        timestamp: String(v["timestamp"] ?? ""),
        eventType: e.event_type,
        level: getLevel(v),
        route: String(v["route"] ?? "/"),
        message: getMessage(v),
        evidenceId: e.event_id,
      };
    });

    // 筛选
    if (p.level) {
      items = items.filter((i) => {
        const evt = events.find((e) => e.event_id === i.evidenceId) as Record<string, unknown> | undefined;
        return evt && getLevel(evt) === p.level;
      });
    }
    if (p.messageContains) {
      const kw = p.messageContains.toLowerCase();
      items = items.filter((i) => i.message.toLowerCase().includes(kw));
    }

    // 分页
    const cursorIdx = p.cursor ? parseInt(p.cursor, 10) : 0;
    const limit = Math.min(p.limit, 200);
    const page = items.slice(cursorIdx, cursorIdx + limit);
    const nextCursor = cursorIdx + limit < items.length ? String(cursorIdx + limit) : undefined;

    return c.json({
      queryStatus: "complete" as const,
      tenantId: principal.tenantId,
      timeRange: { start: p.start, end: p.end },
      items: page,
      nextCursor,
      generatedAt: new Date().toISOString(),
    } satisfies LogSearchResult);
  },
);

// ---- Error Trend ----

query.get(
  "/v1/query/logs/error-trend",
  zValidator("query", z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
    appId: z.string().min(1).max(128),
    environment: z.string().min(1).max(64).optional(),
    release: z.string().min(1).max(128).optional(),
    route: z.string().max(256).optional(),
    granularity: z.string().optional(),
  })),
  (c) => {
    const p = c.req.valid("query");
    const principal = authorizeQuery(c.req.header("Authorization"), p.appId, p.environment);
    const events = store.query({
      appId: p.appId,
      tenantId: principal.tenantId,
      start: p.start,
      end: p.end,
      ...(p.environment ? { environment: p.environment } : {}),
      ...(p.release ? { release: p.release } : {}),
    });
    const scopedEvents = p.route
      ? events.filter((event) => (event as Record<string, unknown>)["route"] === p.route)
      : events;
    const errors = scopedEvents.filter((e) => e.event_type === "frontend_error");

    // 按 5 分钟桶分组
    const bucketMs = 5 * 60 * 1000;
    const buckets = new Map<number, { errors: number; total: number }>();

    const startMs = Date.parse(p.start);
    const endMs = Date.parse(p.end);

    for (let t = startMs; t <= endMs; t += bucketMs) {
      buckets.set(t, { errors: 0, total: 0 });
    }

    for (const e of scopedEvents) {
      const ts = Date.parse(e.timestamp);
      if (isNaN(ts)) continue;
      const bucketKey = Math.floor(ts / bucketMs) * bucketMs;
      const b = buckets.get(bucketKey);
      if (b) {
        if (e.event_type === "frontend_error") b.errors++;
        b.total++;
      }
    }

    const points = [...buckets.entries()]
      .sort(([a], [b]) => a - b)
      .map(([ts, b]) => ({
        timestamp: new Date(ts).toISOString(),
        errorCount: b.errors,
        totalCount: b.total,
        errorRate: b.total > 0 ? Math.round((b.errors / b.total) * 10000) / 100 : 0,
      }));

    return c.json({
      queryStatus: "complete" as const,
      tenantId: principal.tenantId,
      timeRange: { start: p.start, end: p.end },
      points,
      generatedAt: new Date().toISOString(),
    });
  },
);

// ---- Evidence Detail ----

query.get(
  "/v1/query/logs/evidence",
  zValidator("query", z.object({
    id: z.string().min(1),
    appId: z.string().min(1).max(128),
    environment: z.string().min(1).max(64).optional(),
    release: z.string().min(1).max(128).optional(),
  })),
  (c) => {
    const { id, appId, environment, release } = c.req.valid("query");
    const principal = authorizeQuery(c.req.header("Authorization"), appId, environment);
    const event = store.findById(id, principal.tenantId, appId, environment, release);

    if (!event) {
      return c.json({ error: "Event not found" }, 404);
    }

    const v = event as Record<string, unknown>;
    return c.json({
      eventId: event.event_id,
      eventType: event.event_type,
      tenantId: principal.tenantId,
      message: getMessage(v),
      level: getLevel(v),
      route: String(v["route"] ?? "/"),
      timestamp: String(v["timestamp"] ?? ""),
      attributes: typeof v["attributes"] === "object" ? v["attributes"] as Record<string, string> : undefined,
      sanitizedFields: [],
    });
  },
);

export default query;
