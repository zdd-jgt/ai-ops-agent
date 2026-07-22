import { createHash, timingSafeEqual } from "node:crypto";

export type AuthRole = "viewer" | "operator" | "admin" | "service";

export interface AuthPrincipal {
  subject: string;
  tenantId: string;
  roles: AuthRole[];
  allowedAppIds: string[];
  allowedEnvironments: string[];
}

interface TokenRecord extends AuthPrincipal {
  token: string;
}

export type AuthErrorCode = "UNAUTHENTICATED" | "FORBIDDEN" | "INVALID_AUTH_CONFIG";

export class AuthError extends Error {
  constructor(
    public readonly code: AuthErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export class TokenAuthenticator {
  private readonly records: TokenRecord[];

  constructor(records: TokenRecord[]) {
    if (records.length === 0) {
      throw new AuthError("INVALID_AUTH_CONFIG", "At least one auth token is required");
    }
    const subjects = new Set<string>();
    this.records = records.map((record) => {
      validateRecord(record);
      if (subjects.has(record.subject)) {
        throw new AuthError("INVALID_AUTH_CONFIG", "Auth subjects must be unique");
      }
      subjects.add(record.subject);
      return cloneRecord(record);
    });
  }

  authenticate(authorization: string | undefined): AuthPrincipal {
    const token = parseBearerToken(authorization);
    const record = this.records.find((candidate) => constantTimeEqual(candidate.token, token));
    if (!record) throw new AuthError("UNAUTHENTICATED", "Invalid bearer token");
    return toPrincipal(record);
  }
}

export function createTokenAuthenticator(raw: string | undefined): TokenAuthenticator {
  if (!raw?.trim()) {
    throw new AuthError("INVALID_AUTH_CONFIG", "AIOPS_AUTH_TOKENS_JSON is required");
  }
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new AuthError("INVALID_AUTH_CONFIG", "AIOPS_AUTH_TOKENS_JSON must be valid JSON");
  }
  if (!Array.isArray(value)) {
    throw new AuthError("INVALID_AUTH_CONFIG", "AIOPS_AUTH_TOKENS_JSON must be an array");
  }
  return new TokenAuthenticator(value as TokenRecord[]);
}

export function authorizeScope(
  principal: AuthPrincipal,
  requested: { appId: string; environment?: string },
): void {
  if (!principal.allowedAppIds.includes(requested.appId)) {
    throw new AuthError("FORBIDDEN", "Application is outside the authorized scope");
  }
  if (requested.environment && !principal.allowedEnvironments.includes(requested.environment)) {
    throw new AuthError("FORBIDDEN", "Environment is outside the authorized scope");
  }
}

export function requireRole(principal: AuthPrincipal, role: AuthRole): void {
  if (!principal.roles.includes(role)) {
    throw new AuthError("FORBIDDEN", `Role ${role} is required`);
  }
}

export function constantTimeEqual(left: string, right: string): boolean {
  const leftDigest = createHash("sha256").update(left).digest();
  const rightDigest = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftDigest, rightDigest);
}

function parseBearerToken(authorization: string | undefined): string {
  if (!authorization) throw new AuthError("UNAUTHENTICATED", "Bearer token is required");
  const match = /^Bearer\s+([^\s]+)$/i.exec(authorization);
  if (!match?.[1]) throw new AuthError("UNAUTHENTICATED", "Bearer token is required");
  return match[1];
}

function validateRecord(record: TokenRecord): void {
  if (!record || typeof record !== "object") invalid();
  if (!isNonEmpty(record.token) || !isNonEmpty(record.subject) || !isNonEmpty(record.tenantId)) invalid();
  if (!isStringArray(record.roles) || !record.roles.every(isRole)) invalid();
  if (!isStringArray(record.allowedAppIds) || record.allowedAppIds.length === 0) invalid();
  if (!isStringArray(record.allowedEnvironments) || record.allowedEnvironments.length === 0) invalid();
}

function invalid(): never {
  throw new AuthError("INVALID_AUTH_CONFIG", "Invalid auth token record");
}

function isNonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isNonEmpty);
}

function isRole(value: string): value is AuthRole {
  return value === "viewer" || value === "operator" || value === "admin" || value === "service";
}

function cloneRecord(record: TokenRecord): TokenRecord {
  return {
    ...record,
    roles: [...record.roles],
    allowedAppIds: [...record.allowedAppIds],
    allowedEnvironments: [...record.allowedEnvironments],
  };
}

function toPrincipal(record: TokenRecord): AuthPrincipal {
  const { token: _token, ...principal } = cloneRecord(record);
  return principal;
}
