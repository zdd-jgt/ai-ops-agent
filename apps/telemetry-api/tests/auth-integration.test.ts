import { describe, expect, it } from "vitest";
import app from "../src/index.js";

const queryPath = "/v1/query/performance/overview?start=2026-07-22T00:00:00.000Z&end=2026-07-22T01:00:00.000Z&appId=test-app&environment=staging";

describe("tenant authentication integration", () => {
  it("rejects anonymous and unknown bearer query requests", async () => {
    expect((await app.request(queryPath)).status).toBe(401);
    expect((await app.request(queryPath, {
      headers: { Authorization: "Bearer unknown-token-that-must-not-echo" },
    })).status).toBe(401);
  });

  it("returns the server-derived tenant for an authorized query", async () => {
    const response = await app.request(queryPath, {
      headers: { Authorization: "Bearer test-query-token" },
    });
    expect(response.status).toBe(200);
    expect((await response.json()).tenantId).toBe("test-tenant");
  });

  it("rejects cross-application query scope", async () => {
    const response = await app.request(
      "/v1/query/performance/overview?start=2026-07-22T00:00:00.000Z&end=2026-07-22T01:00:00.000Z&appId=outside-app&environment=staging",
      { headers: { Authorization: "Bearer test-query-token" } },
    );
    expect(response.status).toBe(403);
  });

  it("requires authentication for model status and admin for model switch", async () => {
    expect((await app.request("/model/status")).status).toBe(401);
    expect((await app.request("/model/status", {
      headers: { Authorization: "Bearer test-viewer-token" },
    })).status).toBe(200);
    expect((await app.request("/model/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer test-viewer-token" },
      body: JSON.stringify({ provider: "local" }),
    })).status).toBe(403);
  });
});
