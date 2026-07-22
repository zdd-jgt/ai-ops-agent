/**
 * Pipeline 集成测试 — 覆盖 Ingest 全流程: Schema → Rate Limit → Dedup → Normalize → Sanitize → Sink
 *
 * 对应: TC-PIPE-001, TC-PIPE-002, TC-PIPE-004, TC-PIPE-005
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { serve } from "@hono/node-server";
import app, { sink } from "../src/index.js";

// ---- Test Server ----

let server: ReturnType<typeof serve>;
const BASE = "http://localhost:3099";
const AUTH_HEADERS = { Authorization: "Bearer test-query-token" };

beforeAll(async () => {
  server = serve({ fetch: app.fetch, port: 3099 });
  await new Promise((r) => setTimeout(r, 300));
});

afterAll(() => {
  server?.close();
});

// ---- Helpers ----

function validBatch(overrides?: Record<string, unknown>) {
  return {
    schema_version: "1.0.0",
    sdk: { name: "test", version: "0.1.0" },
    sent_at: new Date().toISOString(),
    events: [
      {
        schema_version: "1.0.0",
        event_id: crypto.randomUUID(),
        event_type: "frontend_log" as const,
        timestamp: new Date().toISOString(),
        app_id: "test-app",
        environment: "staging",
        release: "v1.0",
        route: "/test",
        session_id: "sess_test",
        page_url: "https://example.com/test",
        sdk_version: "0.1.0",
        level: "info" as const,
        message: "test message",
        ...overrides,
      },
    ],
  };
}

async function post(path: string, body: unknown, headers?: Record<string, string>) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

// ---- Tests ----

describe("POST /v1/telemetry/batches", () => {
  it("TC-PIPE-001: 合法批次被接受", async () => {
    const { status, body } = await post(
      "/v1/telemetry/batches",
      validBatch(),
      { "X-Telemetry-Write-Key": "pub_test" },
    );
    expect(status).toBe(200);
    expect(body.accepted).toBe(1);
    expect(body.rejected).toBe(0);
    expect(body.results[0].status).toBe("OK");
  });

  it("TC-PIPE-001: 缺少 writeKey 返回 401", async () => {
    const { status } = await post("/v1/telemetry/batches", validBatch());
    expect(status).toBe(401);
  });

  it("TC-PIPE-001: 非法 Schema 返回 422", async () => {
    const { status, body } = await post("/v1/telemetry/batches", { bad: true }, { "X-Telemetry-Write-Key": "pub_test" });
    expect(status).toBe(422);
    expect(body.results[0].status).toBe("INVALID_SCHEMA");
  });

  it("TC-PIPE-002: 超限载荷被拒绝", async () => {
    const { body } = await post(
      "/v1/telemetry/batches",
      validBatch({ message: "x".repeat(2000) }),
      { "X-Telemetry-Write-Key": "pub_test" },
    );
    // 消息超过 MAX_MESSAGE_LENGTH (1024)，Zod Schema 应拒绝
    expect(body.results[0].status).toBe("INVALID_SCHEMA");
  });

  it("TC-PIPE-002: 批次内去重", async () => {
    const ev = validBatch();
    // Duplicate the event
    (ev.events as unknown[]).push({ ...ev.events[0] });
    const { status, body } = await post(
      "/v1/telemetry/batches",
      ev,
      { "X-Telemetry-Write-Key": "pub_test" },
    );
    expect(body.accepted).toBeLessThanOrEqual(1);
    expect(body.rejected).toBeGreaterThanOrEqual(1);
  });

  it("TC-PIPE-004: 空 app_id 被拒绝", async () => {
    const { status, body } = await post(
      "/v1/telemetry/batches",
      validBatch({ app_id: "" }),
      { "X-Telemetry-Write-Key": "pub_test" },
    );
    expect(body.results[0].status).toBe("INVALID_SCHEMA");
  });

  it("TC-PIPE-005: 禁止字段检测", async () => {
    const { status, body } = await post(
      "/v1/telemetry/batches",
      validBatch({ message: "api_key=sk-1234567890abcdef1234567890abcdef" }),
      { "X-Telemetry-Write-Key": "pub_test" },
    );
    expect(body.results[0].status).toBe("INVALID_SCHEMA");
    expect(body.results[0].detail).toContain("forbidden content");
  });
});

describe("GET /v1/query", () => {
  const BASE_QUERY = "start=2026-07-20T00:00:00.000Z&end=2026-07-21T00:00:00.000Z&appId=test-app";

  it("返回性能概览", async () => {
    const res = await fetch(`${BASE}/v1/query/performance/overview?${BASE_QUERY}`, { headers: AUTH_HEADERS });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.queryStatus).toBe("complete");
  });

  it("拒绝超过 30 天的时间范围", async () => {
    const res = await fetch(`${BASE}/v1/query/performance/overview?start=2026-06-01T00:00:00.000Z&end=2026-07-21T00:00:00.000Z&appId=test-app`, { headers: AUTH_HEADERS });
    expect(res.status).toBe(400);
  });

  it("返回页面统计", async () => {
    const res = await fetch(`${BASE}/v1/query/performance/pages?${BASE_QUERY}`, { headers: AUTH_HEADERS });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.pages)).toBe(true);
  });

  it("返回日志搜索", async () => {
    const res = await fetch(`${BASE}/v1/query/logs/search?${BASE_QUERY}`, { headers: AUTH_HEADERS });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.items)).toBe(true);
  });
});

describe("GET /health", () => {
  it("返回健康状态", async () => {
    const res = await fetch(`${BASE}/health`);
    const body = await res.json();
    expect(body.status).toBe("ok");
  });
});
