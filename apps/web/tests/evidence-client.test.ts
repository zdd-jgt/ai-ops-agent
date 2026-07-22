import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchEvidenceDetail } from "../src/features/observability/api/client.js";

afterEach(() => vi.unstubAllGlobals());

describe("Evidence API scope", () => {
  it("includes appId when requesting Evidence details", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      eventId: "evt-1",
      message: "test",
      level: "info",
      route: "/",
      timestamp: new Date().toISOString(),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchEvidenceDetail("evt-1", "review-app", { environment: "production", release: "v2" });
    const url = new URL(String(fetchMock.mock.calls[0]![0]));
    expect(url.searchParams.get("id")).toBe("evt-1");
    expect(url.searchParams.get("appId")).toBe("review-app");
    expect(url.searchParams.get("environment")).toBe("production");
    expect(url.searchParams.get("release")).toBe("v2");
  });
});
