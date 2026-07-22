import { describe, expect, it } from "vitest";
import { WriteKeyRegistry, createWriteKeyRegistry } from "../src/policy/write-key.js";

const record = {
  key: "write-test-token",
  tenantId: "tenant-a",
  appId: "app-a",
  allowedEnvironments: ["staging"],
  allowedOrigins: ["https://console.example"],
  allowMissingOrigin: false,
};

describe("WriteKeyRegistry", () => {
  it("derives tenant scope for the bound app, environment and origin", () => {
    const registry = new WriteKeyRegistry([record]);
    expect(registry.authorize("write-test-token", {
      appIds: ["app-a"],
      environments: ["staging"],
      origin: "https://console.example",
    })).toEqual({
      tenantId: "tenant-a",
      appId: "app-a",
      allowedEnvironments: ["staging"],
      allowedOrigins: ["https://console.example"],
      allowMissingOrigin: false,
    });
  });

  it.each([
    ["unknown key", "unknown", "app-a", "staging", "https://console.example"],
    ["cross app", "write-test-token", "app-b", "staging", "https://console.example"],
    ["cross environment", "write-test-token", "app-a", "production", "https://console.example"],
    ["cross origin", "write-test-token", "app-a", "staging", "https://evil.example"],
  ])("rejects %s without echoing credentials", (_case, key, appId, environment, origin) => {
    const registry = new WriteKeyRegistry([record]);
    expect(() => registry.authorize(key, { appIds: [appId], environments: [environment], origin }))
      .toThrowError(/Invalid telemetry write key|outside the write key scope/);
  });

  it("fails closed when production-style registry configuration is missing", () => {
    const previous = process.env["NODE_ENV"];
    process.env["NODE_ENV"] = "production";
    try {
      expect(() => createWriteKeyRegistry(undefined)).toThrow("TELEMETRY_WRITE_KEYS_JSON is required");
    } finally {
      process.env["NODE_ENV"] = previous;
    }
  });
});
