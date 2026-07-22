import {
  resolveConfig,
  EventBuffer,
  shouldSample,
  MockTransport,
} from "@ai-ops/web-telemetry-sdk";
import type { TelemetryEventV1, TelemetryBatchV1 } from "@ai-ops/telemetry-contracts";

// ---- Setup ----

const transport = new MockTransport();
const config = resolveConfig({
  appId: "sdk-demo",
  endpoint: "https://telemetry.example.com/v1/batches",
  writeKey: "pub_demo",
  routeResolver: (url) => new URL(url).pathname,
  environment: "development",
  release: "demo",
  flushIntervalMs: 5000,
});

const buffer = new EventBuffer(config);

// ---- Helpers ----

function makeEvent(
  overrides: Partial<TelemetryEventV1> & { event_type: TelemetryEventV1["event_type"] }
): TelemetryEventV1 {
  return {
    schema_version: "1.0.0",
    event_id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    app_id: config.appId,
    environment: config.environment,
    release: config.release,
    route: config.routeResolver(window.location.href),
    session_id: "demo_session",
    page_url: window.location.origin + window.location.pathname,
    sdk_version: "0.1.0",
    ...overrides,
  } as TelemetryEventV1;
}

function log(msg: string) {
  const el = document.getElementById("batchLog")!;
  if (el.textContent === "等待事件…") el.textContent = "";
  el.textContent += msg + "\n";
}

async function flushToTransport() {
  const snapshot = buffer.drain();
  if (snapshot.events.length === 0) {
    log("⚠️ 缓冲区为空，无事件可发送");
    return;
  }
  const batch: TelemetryBatchV1 = {
    schema_version: "1.0.0",
    sdk: { name: "@ai-ops/web-telemetry-sdk", version: "0.1.0" },
    sent_at: new Date().toISOString(),
    events: snapshot.events,
  };
  const result = await transport.send(batch);
  log(`✅ Flush: ${result.accepted} accepted, ${result.rejected} rejected, ${snapshot.droppedCount} dropped`);
}

// ---- Button Handlers ----

document.getElementById("btnFlush")!.onclick = () => {
  // Push some events then flush
  buffer.push(makeEvent({ event_type: "frontend_log", level: "info", message: "用户点击了 Flush 按钮" }));
  buffer.push(makeEvent({ event_type: "page_view", view_type: "initial_load" }));
  flushToTransport();
};

document.getElementById("btnShow")!.onclick = () => {
  const el = document.getElementById("batchLog")!;
  if (transport.batches.length === 0) {
    el.textContent = "暂无批次记录";
  } else {
    el.textContent = JSON.stringify(transport.batches, null, 2);
  }
};

document.getElementById("btnReset")!.onclick = () => {
  transport.reset();
  buffer.clear();
  document.getElementById("batchLog")!.textContent = "等待事件…";
  document.getElementById("testResults")!.innerHTML = "";
};

document.getElementById("btnTest")!.onclick = runIntegrationTests;

// ---- Integration Tests ----

interface TestCase {
  name: string;
  run: () => boolean | Promise<boolean>;
}

async function runIntegrationTests() {
  const results: { name: string; pass: boolean; detail?: string }[] = [];

  // Test 1: Buffer accepts events
  {
    const b = new EventBuffer(config);
    const dropped = b.push(makeEvent({ event_type: "frontend_log", level: "info", message: "t1" }));
    results.push({ name: "Buffer 接受事件", pass: b.size === 1 && dropped === 0 });
  }

  // Test 2: Buffer drain respects batchMaxEvents
  {
    const b = new EventBuffer(resolveConfig({ ...config, batchMaxEvents: 3 }));
    for (let i = 0; i < 5; i++) {
      b.push(makeEvent({ event_type: "frontend_log", level: "info", message: `e${i}`, event_id: crypto.randomUUID() }));
    }
    const snap = b.drain();
    results.push({ name: "drain 遵守 batchMaxEvents (3)", pass: snap.events.length === 3 && b.size === 2 });
  }

  // Test 3: Sampling deterministic
  {
    const results_set = new Set<boolean>();
    for (let i = 0; i < 100; i++) {
      results_set.add(shouldSample("sess_abc", "web_vital", 0.5));
    }
    results.push({ name: "采样确定性 (同 session 一致)", pass: results_set.size === 1 });
  }

  // Test 4: MockTransport records batches
  {
    const t = new MockTransport();
    const batch: TelemetryBatchV1 = {
      schema_version: "1.0.0",
      sdk: { name: "test", version: "0.1.0" },
      sent_at: new Date().toISOString(),
      events: [makeEvent({ event_type: "frontend_log", level: "info", message: "t4" })],
    };
    await t.send(batch);
    results.push({ name: "MockTransport 记录批次", pass: t.batches.length === 1 });
  }

  // Test 5: MockTransport fails when shouldFail=true
  {
    const t = new MockTransport();
    t.shouldFail = true;
    const batch: TelemetryBatchV1 = {
      schema_version: "1.0.0",
      sdk: { name: "test", version: "0.1.0" },
      sent_at: new Date().toISOString(),
      events: [makeEvent({ event_type: "frontend_log", level: "info", message: "t5" })],
    };
    const result = await t.send(batch);
    results.push({ name: "MockTransport 故障模拟", pass: result.rejected > 0 });
  }

  // Test 6: Buffer rejects oversized event
  {
    const b = new EventBuffer(resolveConfig({ ...config, eventMaxBytes: 100 }));
    const dropped = b.push(makeEvent({ event_type: "frontend_log", level: "info", message: "x".repeat(10000) }));
    results.push({ name: "超限事件被拒绝", pass: dropped === 1 && b.size === 0 });
  }

  // ---- Render ----
  const passed = results.filter((r) => r.pass).length;
  const el = document.getElementById("testResults")!;
  el.innerHTML = `
    <p><span class="badge ${passed === results.length ? "badge-ok" : "badge-warn"}">${passed}/${results.length} 通过</span></p>
    <table>
      <tr><th>测试</th><th>结果</th></tr>
      ${results.map((r) => `<tr><td>${r.name}</td><td>${r.pass ? "✅" : "❌"}</td></tr>`).join("")}
    </table>
  `;
}

// ---- Init ----
log("🚀 SDK Demo 已就绪。点击上方按钮开始测试。");
