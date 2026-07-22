import { afterEach, describe, it, expect, vi } from "vitest";
import { QueryApiError, RateLimitError, ForbiddenError, fetchPerformanceOverview } from "../src/features/observability/api/client.js";

afterEach(() => vi.unstubAllGlobals());

describe("QueryApiError", () => {
  it("应该正确设置 name 和 status", () => {
    const err = new QueryApiError(500, "server error");
    expect(err.name).toBe("QueryApiError");
    expect(err.status).toBe(500);
    expect(err.message).toContain("500");
    expect(err.message).toContain("server error");
  });
});

describe("RateLimitError", () => {
  it("应该继承 QueryApiError 且 status=429", () => {
    const err = new RateLimitError();
    expect(err).toBeInstanceOf(QueryApiError);
    expect(err.status).toBe(429);
  });
});

describe("ForbiddenError", () => {
  it("应该继承 QueryApiError 且 status=403", () => {
    const err = new ForbiddenError();
    expect(err).toBeInstanceOf(QueryApiError);
    expect(err.status).toBe(403);
  });
});

describe("Query scope", () => {
  it("sends environment, release and route to the controlled query API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      queryStatus: "complete", sampleCount: 0,
      p75: { lcp: null, inp: null, cls: null, fcp: null, ttfb: null },
      timeRange: { start: "2026-07-22T00:00:00.000Z", end: "2026-07-22T01:00:00.000Z" },
      generatedAt: "2026-07-22T01:00:00.000Z",
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchPerformanceOverview(
      "2026-07-22T00:00:00.000Z", "2026-07-22T01:00:00.000Z", "scope-app",
      { environment: "production", release: "v2", route: "/checkout" },
    );
    const url = new URL(String(fetchMock.mock.calls[0]![0]));
    expect(url.searchParams.get("environment")).toBe("production");
    expect(url.searchParams.get("release")).toBe("v2");
    expect(url.searchParams.get("route")).toBe("/checkout");
  });
});
