import { describe, expect, it } from "vitest";
import {
  AuthError,
  TokenAuthenticator,
  authorizeScope,
  createTokenAuthenticator,
  requireRole,
} from "../src/index.js";

const record = {
  token: "unit-test-token",
  subject: "console-user",
  tenantId: "tenant-a",
  roles: ["viewer"] as const,
  allowedAppIds: ["app-a"],
  allowedEnvironments: ["staging"],
};

describe("TokenAuthenticator", () => {
  it("authenticates a bearer token without returning the credential", () => {
    const auth = new TokenAuthenticator([{ ...record, roles: [...record.roles] }]);
    const principal = auth.authenticate("Bearer unit-test-token");
    expect(principal).toEqual({
      subject: "console-user",
      tenantId: "tenant-a",
      roles: ["viewer"],
      allowedAppIds: ["app-a"],
      allowedEnvironments: ["staging"],
    });
    expect(principal).not.toHaveProperty("token");
  });

  it("rejects missing and unknown credentials without echoing them", () => {
    const auth = new TokenAuthenticator([{ ...record, roles: [...record.roles] }]);
    expect(() => auth.authenticate(undefined)).toThrow(AuthError);
    expect(() => auth.authenticate("Bearer secret-that-must-not-echo")).toThrow("Invalid bearer token");
  });

  it("enforces application, environment and role scopes", () => {
    const auth = new TokenAuthenticator([{ ...record, roles: [...record.roles] }]);
    const principal = auth.authenticate("Bearer unit-test-token");
    expect(() => authorizeScope(principal, { appId: "app-a", environment: "staging" })).not.toThrow();
    expect(() => authorizeScope(principal, { appId: "app-b" })).toThrow(AuthError);
    expect(() => requireRole(principal, "admin")).toThrow(AuthError);
  });

  it("fails closed for missing or malformed registry configuration", () => {
    expect(() => createTokenAuthenticator(undefined)).toThrow("AIOPS_AUTH_TOKENS_JSON is required");
    expect(() => createTokenAuthenticator("not-json")).toThrow("must be valid JSON");
  });
});
