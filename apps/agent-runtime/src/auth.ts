import {
  type AuthPrincipal,
  authorizeScope,
  createTokenAuthenticator,
} from "@ai-ops/auth-contracts";

const TEST_AUTH_TOKENS = JSON.stringify([
  {
    token: "test-query-token",
    subject: "test-console",
    tenantId: "test-tenant",
    roles: ["viewer", "admin", "service"],
    allowedAppIds: ["test-app", "my-app", "e2e-app", "demo-app"],
    allowedEnvironments: ["development", "staging", "production"],
  },
]);

const authenticator = createTokenAuthenticator(
  process.env["AIOPS_AUTH_TOKENS_JSON"]
    ?? (process.env["NODE_ENV"] === "test" ? TEST_AUTH_TOKENS : undefined),
);

export function authenticateDiagnosisRequest(
  authorization: string | undefined,
  appId: string,
  environment: string,
): AuthPrincipal {
  const principal = authenticator.authenticate(authorization);
  authorizeScope(principal, { appId, environment });
  return principal;
}
