import { beforeEach, describe, expect, it, vi } from "vitest";
import { setScope } from "../src/policy/index.js";
import { createFrontendObservabilityAdapter } from "../src/tools/frontend-observability/index.js";

const range = {
  start: "2026-07-22T00:00:00.000Z",
  end: "2026-07-22T01:00:00.000Z",
};

beforeEach(() => {
  setScope({
    appIds: ["my-app"],
    tenantId: "test-tenant",
    environments: ["production"],
    maxTimeRangeMs: 3_600_000,
    maxCallsPerRound: 2,
  });
  vi.restoreAllMocks();
});

describe("frontend observability adapter", () => {
  it("returns only real evidence IDs from Query API", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      queryStatus: "complete",
      sampleCount: 1,
      p75: { lcp: 1800, inp: null, cls: 0.04, fcp: null, ttfb: null },
      evidenceIds: ["real-event-1"],
    }), { status: 200 })));

    const result = await createFrontendObservabilityAdapter().queryPagePerformance({
      appId: "my-app",
      environment: "production",
      ...range,
    });

    expect(result.evidenceIds).toEqual(["real-event-1"]);
    expect(result.evidenceIds[0]).not.toMatch(/^evt_[0-9a-f]{12}$/);
  });

  it("enforces app, environment and per-round call budget before querying", async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(
      new Response(JSON.stringify({
        queryStatus: "complete",
        sampleCount: 0,
        p75: { lcp: null, inp: null, cls: null, fcp: null, ttfb: null },
        evidenceIds: [],
      }), { status: 200 }),
    ));
    vi.stubGlobal("fetch", fetchMock);

    await expect(createFrontendObservabilityAdapter().queryPagePerformance({
      appId: "other-app",
      environment: "production",
      ...range,
    })).rejects.toThrow("not in the authorized scope");

    const adapter = createFrontendObservabilityAdapter();
    await adapter.queryPagePerformance({ appId: "my-app", environment: "production", ...range });
    await adapter.queryPagePerformance({ appId: "my-app", environment: "production", ...range });
    await expect(adapter.queryPagePerformance({
      appId: "my-app",
      environment: "production",
      ...range,
    })).rejects.toThrow("budget exhausted");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("resolves evidence inside app and environment scope", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      eventId: "real-log-1",
      eventType: "frontend_error",
      message: "sanitized error",
      level: "error",
      route: "/checkout",
      timestamp: range.start,
      sanitizedFields: ["authorization"],
    }), { status: 200 })));

    const result = await createFrontendObservabilityAdapter().getFrontendLogEvent({
      evidenceId: "real-log-1",
      appId: "my-app",
      environment: "production",
    });

    expect(result.event?.evidenceId).toBe("real-log-1");
    expect(result.actualFilters).toEqual({
      tenantId: "test-tenant",
      evidenceId: "real-log-1",
      appId: "my-app",
      environment: "production",
    });
  });
});
