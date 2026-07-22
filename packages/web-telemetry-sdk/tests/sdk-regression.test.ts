// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TelemetryBatchV1, TelemetryEventV1 } from "@ai-ops/telemetry-contracts";
import { EventBuffer, FetchTransport, resolveConfig } from "../src/index.js";
import { PageViewCollector } from "../src/collectors/performance/page-view-collector.js";

function makeConfig(overrides: Record<string, unknown> = {}) {
  return resolveConfig({
    appId: "test-app",
    endpoint: "https://telemetry.test/v1/telemetry/batches",
    writeKey: "pub_test",
    routeResolver: (url) => new URL(url).pathname,
    retryBaseMs: 1,
    retryMaxMs: 1,
    ...overrides,
  });
}

function makeEvent(overrides: Record<string, unknown> = {}): TelemetryEventV1 {
  return {
    schema_version: "1.0.0",
    event_id: crypto.randomUUID(),
    event_type: "frontend_log",
    timestamp: new Date().toISOString(),
    app_id: "test-app",
    environment: "staging",
    release: "v1",
    route: "/test",
    session_id: "session",
    page_url: "https://example.test/test",
    sdk_version: "0.1.0",
    level: "info",
    message: "test",
    ...overrides,
  } as TelemetryEventV1;
}

function makeBatch(): TelemetryBatchV1 {
  return {
    schema_version: "1.0.0",
    sdk: { name: "test", version: "0.1.0" },
    sent_at: new Date().toISOString(),
    events: [makeEvent()],
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("SDK delivery regressions", () => {
  it("marks the buffer flushable at the event-count threshold", () => {
    const buffer = new EventBuffer(makeConfig({ batchMaxEvents: 2 }));
    buffer.push(makeEvent());
    expect(buffer.shouldFlush).toBe(false);
    buffer.push(makeEvent());
    expect(buffer.shouldFlush).toBe(true);
  });

  it("retries a retryable HTTP response and preserves the batch", async () => {
    vi.useFakeTimers();
    const batch = makeBatch();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("", { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        accepted: 1,
        rejected: 0,
        results: [{ index: 0, event_id: batch.events[0]!.event_id, status: "OK" }],
      }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const transport = new FetchTransport(makeConfig({ maxRetries: 1 }));
    const resultPromise = transport.send(batch);
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.accepted).toBe(1);
    transport.close();
  });

  it("puts the public write key on Beacon unload requests", () => {
    const sendBeacon = vi.fn(() => true);
    vi.stubGlobal("navigator", { sendBeacon });
    const transport = new FetchTransport(makeConfig());
    transport.sendUnload(makeBatch());
    expect(sendBeacon).toHaveBeenCalledOnce();
    expect(String(sendBeacon.mock.calls[0]![0])).toContain("writeKey=pub_test");
    transport.close();
  });
});

describe("SPA navigation regressions", () => {
  it("captures pushState route changes and restores history on stop", () => {
    window.history.replaceState({}, "", "/start");
    const originalPushState = window.history.pushState;
    const events: TelemetryEventV1[] = [];
    const collector = new PageViewCollector({
      appId: "test-app",
      environment: "staging",
      release: "v1",
      sdkVersion: "0.1.0",
      disabled: false,
      routeResolver: (url) => new URL(url).pathname,
      getSessionId: () => "session",
    }, (event) => events.push(event));

    collector.start();
    events.length = 0;
    window.history.pushState({}, "", "/next");

    expect(events).toEqual([
      expect.objectContaining({ event_type: "page_view", view_type: "route_change", route: "/next", previous_route: "/start" }),
    ]);
    collector.stop();
    expect(window.history.pushState).toBe(originalPushState);
  });
});
