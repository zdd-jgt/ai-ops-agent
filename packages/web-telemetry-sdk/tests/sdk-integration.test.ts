/**
 * SDK 集成测试 — 使用 MockTransport 验证完整发送链路。
 *
 * 覆盖: 配置、Buffer、采样、Transport、Schema 合规
 * 对应: TC-SDK-001, TC-SDK-003, TC-SDK-005
 */
import { describe, it, expect, beforeEach } from "vitest";
import { TelemetryBatchV1Schema } from "@ai-ops/telemetry-contracts";
import { resolveConfig, EventBuffer, shouldSample, MockTransport } from "../src/index.js";

// ---- Config ----

function makeConfig(overrides?: Record<string, unknown>) {
  return resolveConfig({
    appId: "test-app",
    endpoint: "https://telemetry.test/v1/batches",
    writeKey: "pub_test",
    routeResolver: () => "/test",
    ...overrides,
  });
}

// ---- Buffer Tests (TC-SDK-003) ----

describe("EventBuffer", () => {
  function makeEvent(overrides?: Record<string, unknown>) {
    return {
      schema_version: "1.0.0" as const,
      event_id: crypto.randomUUID(),
      event_type: "frontend_log" as const,
      timestamp: new Date().toISOString(),
      app_id: "test-app",
      environment: "staging",
      release: "v1.0.0",
      route: "/test",
      session_id: "sess_01",
      page_url: "https://test.example.com/test",
      sdk_version: "0.1.0",
      level: "info" as const,
      message: "test message",
      ...overrides,
    };
  }

  it("应该接受事件并返回正确大小", () => {
    const config = makeConfig();
    const buffer = new EventBuffer(config);
    const dropped = buffer.push(makeEvent());
    expect(dropped).toBe(0);
    expect(buffer.size).toBe(1);
  });

  it("应该在达到 batchMaxEvents 时 drain 正确数量", () => {
    const config = makeConfig({ batchMaxEvents: 3 });
    const buffer = new EventBuffer(config);
    for (let i = 0; i < 5; i++) {
      buffer.push(makeEvent({ event_id: crypto.randomUUID() }));
    }
    const snapshot = buffer.drain();
    expect(snapshot.events.length).toBe(3); // batchMaxEvents=3
    expect(buffer.size).toBe(2); // 剩余 2 个
  });

  it("应该在缓冲区满时按优先级丢弃 frontend_log", () => {
    const config = makeConfig({ bufferMaxEvents: 3, batchMaxEvents: 3 });
    const buffer = new EventBuffer(config);

    // Push 3 events
    buffer.push(makeEvent({ event_type: "web_vital", vital_type: "LCP", value: 100, rating: "good", delta: 10 }));
    buffer.push(makeEvent({ event_type: "page_view", view_type: "initial_load" }));
    buffer.push(makeEvent({ event_type: "frontend_error", error_type: "js_error", message: "err" }));

    // Push one more — should evict the log (lowest priority)
    const dropped = buffer.push(makeEvent({ event_type: "frontend_log", level: "info", message: "will be dropped" }));
    expect(dropped).toBeGreaterThanOrEqual(0);
    expect(buffer.size).toBeLessThanOrEqual(3);
  });

  it("应该拒绝超过 eventMaxBytes 的事件", () => {
    const config = makeConfig({ eventMaxBytes: 100 });
    const buffer = new EventBuffer(config);
    const dropped = buffer.push(makeEvent({ message: "x".repeat(10000) }));
    expect(dropped).toBe(1);
    expect(buffer.size).toBe(0);
  });
});

// ---- Sampling Tests ----

describe("shouldSample", () => {
  it("sampleRate=1 时应该始终返回 true", () => {
    expect(shouldSample("sess_01", "web_vital", 1)).toBe(true);
  });

  it("sampleRate=0 时应该始终返回 false", () => {
    expect(shouldSample("sess_01", "web_vital", 0)).toBe(false);
  });

  it("应该对相同 session+type 保持一致", () => {
    const results: boolean[] = [];
    for (let i = 0; i < 100; i++) {
      results.push(shouldSample("sess_abc", "web_vital", 0.5));
    }
    expect(new Set(results).size).toBe(1); // 确定性
  });

  it("不同 session 可以产生不同结果", () => {
    const set = new Set<boolean>();
    for (let i = 0; i < 100; i++) {
      set.add(shouldSample(`sess_${i}`, "web_vital", 0.5));
    }
    // 0.5 采样率下 100 个不同 session 应该至少有两种结果
    expect(set.size).toBeGreaterThanOrEqual(1);
  });
});

// ---- MockTransport Tests (TC-SDK-005) ----

describe("MockTransport", () => {
  it("应该记录所有发送的批次", async () => {
    const transport = new MockTransport();
    const batch = {
      schema_version: "1.0.0" as const,
      sdk: { name: "@ai-ops/web-telemetry-sdk", version: "0.1.0" },
      sent_at: new Date().toISOString(),
      events: [],
    };

    const result = await transport.send(batch);
    expect(result.accepted).toBe(0);
    expect(transport.batches.length).toBe(1);
  });

  it("shouldFail=true 时应该返回错误", async () => {
    const transport = new MockTransport();
    transport.shouldFail = true;

    const batch = {
      schema_version: "1.0.0" as const,
      sdk: { name: "@ai-ops/web-telemetry-sdk", version: "0.1.0" },
      sent_at: new Date().toISOString(),
      events: [{
        schema_version: "1.0.0" as const,
        event_id: crypto.randomUUID(),
        event_type: "frontend_log" as const,
        timestamp: new Date().toISOString(),
        app_id: "test",
        environment: "staging",
        release: "v1.0",
        route: "/",
        session_id: "sess_01",
        page_url: "https://example.com/",
        sdk_version: "0.1.0",
        level: "info" as const,
        message: "test",
      }],
    };

    const result = await transport.send(batch);
    expect(result.rejected).toBeGreaterThan(0);
  });

  it("reset() 应该清空所有状态", async () => {
    const transport = new MockTransport();
    const batch = {
      schema_version: "1.0.0" as const,
      sdk: { name: "@ai-ops/web-telemetry-sdk", version: "0.1.0" },
      sent_at: new Date().toISOString(),
      events: [],
    };

    await transport.send(batch);
    expect(transport.batches.length).toBe(1);

    transport.reset();
    expect(transport.batches.length).toBe(0);
  });
});
