import { describe, expect, it } from "vitest";
import { authenticateDiagnosisRequest } from "../src/auth.js";

describe("Agent diagnosis authentication", () => {
  it("derives tenant from the bearer principal", () => {
    const principal = authenticateDiagnosisRequest("Bearer test-query-token", "my-app", "production");
    expect(principal.tenantId).toBe("test-tenant");
  });

  it("rejects anonymous and cross-application requests", () => {
    expect(() => authenticateDiagnosisRequest(undefined, "my-app", "production")).toThrow();
    expect(() => authenticateDiagnosisRequest("Bearer test-query-token", "outside-app", "production"))
      .toThrow("outside the authorized scope");
  });
});
