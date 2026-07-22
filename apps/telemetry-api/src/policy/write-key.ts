import { AuthError, constantTimeEqual } from "@ai-ops/auth-contracts";

export interface IngestScope {
  tenantId: string;
  appId: string;
  allowedEnvironments: string[];
  allowedOrigins: string[];
  allowMissingOrigin: boolean;
}

interface WriteKeyRecord extends IngestScope {
  key: string;
}

const TEST_WRITE_KEYS = JSON.stringify([
  {
    key: "pub_test",
    tenantId: "test-tenant",
    appId: "test-app",
    allowedEnvironments: ["staging"],
    allowedOrigins: ["*"],
    allowMissingOrigin: true,
  },
  ...["pub_beacon", "pub_dedup", "pub_evidence", "pub_scope"].map((key) => ({
    key,
    tenantId: "test-tenant",
    appId: "review-app",
    allowedEnvironments: ["staging", "production"],
    allowedOrigins: ["*"],
    allowMissingOrigin: true,
  })),
]);

export class WriteKeyRegistry {
  private readonly records: WriteKeyRecord[];

  constructor(records: WriteKeyRecord[]) {
    if (records.length === 0) throw configError("At least one telemetry write key is required");
    const keys = new Set<string>();
    this.records = records.map((record) => {
      validateRecord(record);
      const fingerprint = keyFingerprint(record.key);
      if (keys.has(fingerprint)) throw configError("Telemetry write keys must be unique");
      keys.add(fingerprint);
      return cloneRecord(record);
    });
  }

  authorize(
    key: string | undefined,
    request: { appIds: string[]; environments: string[]; origin?: string },
  ): IngestScope {
    if (!key?.trim()) throw new AuthError("UNAUTHENTICATED", "Telemetry write key is required");
    const record = this.records.find((candidate) => constantTimeEqual(candidate.key, key));
    if (!record) throw new AuthError("UNAUTHENTICATED", "Invalid telemetry write key");
    if (request.appIds.some((appId) => appId !== record.appId)) {
      throw new AuthError("FORBIDDEN", "Application is outside the write key scope");
    }
    if (request.environments.some((environment) => !record.allowedEnvironments.includes(environment))) {
      throw new AuthError("FORBIDDEN", "Environment is outside the write key scope");
    }
    if (!originAllowed(record, request.origin)) {
      throw new AuthError("FORBIDDEN", "Origin is outside the write key scope");
    }
    return toScope(record);
  }
}

export function createWriteKeyRegistry(raw: string | undefined): WriteKeyRegistry {
  const source = raw ?? (process.env["NODE_ENV"] === "test" ? TEST_WRITE_KEYS : undefined);
  if (!source?.trim()) throw configError("TELEMETRY_WRITE_KEYS_JSON is required");
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    throw configError("TELEMETRY_WRITE_KEYS_JSON must be valid JSON");
  }
  if (!Array.isArray(value)) throw configError("TELEMETRY_WRITE_KEYS_JSON must be an array");
  return new WriteKeyRegistry(value as WriteKeyRecord[]);
}

function originAllowed(record: WriteKeyRecord, origin: string | undefined): boolean {
  if (!origin) return record.allowMissingOrigin;
  return record.allowedOrigins.includes("*") || record.allowedOrigins.includes(origin);
}

function validateRecord(record: WriteKeyRecord): void {
  if (!record || typeof record !== "object") throw configError("Invalid telemetry write key record");
  if (!nonEmpty(record.key) || !nonEmpty(record.tenantId) || !nonEmpty(record.appId)) {
    throw configError("Invalid telemetry write key record");
  }
  if (!stringArray(record.allowedEnvironments) || record.allowedEnvironments.length === 0) {
    throw configError("Invalid telemetry write key environments");
  }
  if (!stringArray(record.allowedOrigins) || record.allowedOrigins.length === 0) {
    throw configError("Invalid telemetry write key origins");
  }
  if (typeof record.allowMissingOrigin !== "boolean") {
    throw configError("Invalid telemetry missing-origin policy");
  }
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(nonEmpty);
}

function keyFingerprint(key: string): string {
  return Buffer.from(key).toString("base64");
}

function configError(message: string): AuthError {
  return new AuthError("INVALID_AUTH_CONFIG", message);
}

function cloneRecord(record: WriteKeyRecord): WriteKeyRecord {
  return {
    ...record,
    allowedEnvironments: [...record.allowedEnvironments],
    allowedOrigins: [...record.allowedOrigins],
  };
}

function toScope(record: WriteKeyRecord): IngestScope {
  const { key: _key, ...scope } = cloneRecord(record);
  return scope;
}
