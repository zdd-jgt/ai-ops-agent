/** Server-derived authorization scope. Model input is never trusted as policy. */
export interface Scope {
  allowedAppIds: string[];
  tenantId: string;
  allowedEnvironments: string[];
  maxTimeRangeMs: number;
  maxCallsPerRound: number;
}

const DEFAULT_SCOPE: Scope = {
  allowedAppIds: [],
  tenantId: "",
  allowedEnvironments: ["development", "staging", "production"],
  maxTimeRangeMs: 60 * 60 * 1000,
  maxCallsPerRound: 4,
};

let currentScope: Scope = { ...DEFAULT_SCOPE };

export function setScope(token: {
  appIds: string[];
  tenantId: string;
  environments?: string[];
  maxTimeRangeMs?: number;
  maxCallsPerRound?: number;
}): void {
  const maxTimeRangeMs = token.maxTimeRangeMs ?? DEFAULT_SCOPE.maxTimeRangeMs;
  if (!token.tenantId.trim()) {
    throw new ScopeError("tenantId must be explicitly configured");
  }
  const maxCallsPerRound = token.maxCallsPerRound ?? DEFAULT_SCOPE.maxCallsPerRound;
  if (!Number.isFinite(maxTimeRangeMs) || maxTimeRangeMs <= 0) {
    throw new ScopeError("maxTimeRangeMs must be a positive finite number");
  }
  if (!Number.isSafeInteger(maxCallsPerRound) || maxCallsPerRound <= 0) {
    throw new ScopeError("maxCallsPerRound must be a positive safe integer");
  }

  currentScope = {
    ...DEFAULT_SCOPE,
    allowedAppIds: [...token.appIds],
    tenantId: token.tenantId,
    allowedEnvironments: token.environments
      ? [...token.environments]
      : [...DEFAULT_SCOPE.allowedEnvironments],
    maxTimeRangeMs,
    maxCallsPerRound,
  };
}

export function getScope(): Readonly<Scope> {
  return currentScope;
}

export function validateAppId(appId: string): void {
  if (currentScope.allowedAppIds.length === 0) {
    throw new ScopeError("No apps authorized - scope not initialized");
  }
  if (!currentScope.allowedAppIds.includes(appId)) {
    throw new ScopeError(`App "${appId}" is not in the authorized scope`);
  }
}

export function validateEnvironment(environment?: string): void {
  if (environment && !currentScope.allowedEnvironments.includes(environment)) {
    throw new ScopeError(`Environment "${environment}" is not in the authorized scope`);
  }
}

export function validateTimeRange(start: string, end: string): void {
  const rangeMs = Date.parse(end) - Date.parse(start);
  if (!Number.isFinite(rangeMs) || rangeMs < 0) {
    throw new ScopeError("Invalid time range: start must be before end");
  }
  if (rangeMs > currentScope.maxTimeRangeMs) {
    throw new ScopeError(
      `Time range exceeds maximum of ${currentScope.maxTimeRangeMs / 3_600_000}h`,
    );
  }
}

export class ScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScopeError";
  }
}
