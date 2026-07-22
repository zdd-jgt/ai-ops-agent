import { describe, expect, it } from "vitest";
import { ScopeError, setScope } from "../src/policy/index.js";

describe("scope configuration", () => {
  it("fails closed for non-finite or non-positive time limits", () => {
    expect(() => setScope({ tenantId: "tenant", appIds: ["app"], maxTimeRangeMs: Number.NaN })).toThrow(ScopeError);
    expect(() => setScope({ tenantId: "tenant", appIds: ["app"], maxTimeRangeMs: 0 })).toThrow(ScopeError);
  });

  it("fails closed for invalid call budgets", () => {
    expect(() => setScope({ tenantId: "tenant", appIds: ["app"], maxCallsPerRound: Number.NaN })).toThrow(ScopeError);
    expect(() => setScope({ tenantId: "tenant", appIds: ["app"], maxCallsPerRound: 0 })).toThrow(ScopeError);
    expect(() => setScope({ tenantId: "tenant", appIds: ["app"], maxCallsPerRound: 1.5 })).toThrow(ScopeError);
  });

  it("fails closed when tenant scope is missing", () => {
    expect(() => setScope({ tenantId: "", appIds: ["app"] })).toThrow("tenantId must be explicitly configured");
  });
});
