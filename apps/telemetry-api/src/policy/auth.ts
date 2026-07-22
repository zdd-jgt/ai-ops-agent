import {
  AuthError,
  type AuthPrincipal,
  createTokenAuthenticator,
} from "@ai-ops/auth-contracts";

const TEST_AUTH_TOKENS = JSON.stringify([
  {
    token: "test-query-token",
    subject: "test-console",
    tenantId: "test-tenant",
    roles: ["viewer", "admin", "service"],
    allowedAppIds: ["test-app", "review-app", "e2e-app", "demo-app"],
    allowedEnvironments: ["development", "staging", "production"],
  },
  {
    token: "test-viewer-token",
    subject: "test-viewer",
    tenantId: "test-tenant",
    roles: ["viewer"],
    allowedAppIds: ["test-app", "review-app"],
    allowedEnvironments: ["staging", "production"],
  },
  {
    token: "other-tenant-token",
    subject: "other-tenant-viewer",
    tenantId: "other-tenant",
    roles: ["viewer"],
    allowedAppIds: ["review-app"],
    allowedEnvironments: ["staging", "production"],
  },
]);

function registryJson(): string | undefined {
  return process.env["AIOPS_AUTH_TOKENS_JSON"]
    ?? (process.env["NODE_ENV"] === "test" ? TEST_AUTH_TOKENS : undefined);
}

const authenticator = createTokenAuthenticator(registryJson());

export function authenticateRequest(authorization: string | undefined): AuthPrincipal {
  return authenticator.authenticate(authorization);
}

export function authStatus(error: AuthError): 401 | 403 | 500 {
  if (error.code === "UNAUTHENTICATED") return 401;
  if (error.code === "FORBIDDEN") return 403;
  return 500;
}
