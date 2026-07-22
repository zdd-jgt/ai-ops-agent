import { describe, expect, it } from "vitest";
import { buildMcpChildEnvironment } from "../src/mastra/mcp-client.js";

describe("MCP child environment", () => {
  it("passes only approved runtime settings and server-derived scope", () => {
    const environment = buildMcpChildEnvironment(
      { tenantId: "tenant-a", appId: "app-a", environment: "production" },
      {
        NODE_ENV: "test",
        PATH: "/usr/bin",
        TELEMETRY_API_URL: "http://localhost:3000",
        TELEMETRY_QUERY_TOKEN: "service-token",
        DEEPSEEK_API_KEY: "must-not-pass",
        QWEN_API_KEY: "must-not-pass",
        CUSTOM_MODEL_API_KEY: "must-not-pass",
        AWS_SECRET_ACCESS_KEY: "must-not-pass",
      },
    );

    expect(environment).toMatchObject({
      NODE_ENV: "test",
      PATH: "/usr/bin",
      TELEMETRY_API_URL: "http://localhost:3000",
      TELEMETRY_QUERY_TOKEN: "service-token",
      MCP_TENANT_ID: "tenant-a",
      MCP_ALLOWED_APP_IDS: "app-a",
      MCP_ALLOWED_ENVIRONMENTS: "production",
    });
    expect(environment).not.toHaveProperty("DEEPSEEK_API_KEY");
    expect(environment).not.toHaveProperty("QWEN_API_KEY");
    expect(environment).not.toHaveProperty("CUSTOM_MODEL_API_KEY");
    expect(environment).not.toHaveProperty("AWS_SECRET_ACCESS_KEY");
  });

  it("fails closed without a Query service token", () => {
    expect(() => buildMcpChildEnvironment(
      { tenantId: "tenant-a", appId: "app-a", environment: "production" },
      { NODE_ENV: "production" },
    )).toThrow("TELEMETRY_QUERY_TOKEN is required");
  });
});
