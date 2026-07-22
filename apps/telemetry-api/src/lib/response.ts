import type { TelemetryErrorCode } from "@ai-ops/telemetry-contracts";

// ---- HTTP → Error Code Mapping ----

const STATUS_TO_ERROR: Record<number, TelemetryErrorCode> = {
  400: "INVALID_SCHEMA",
  401: "FORBIDDEN",
  403: "FORBIDDEN",
  413: "BATCH_TOO_LARGE",
  422: "INVALID_SCHEMA",
  429: "RATE_LIMITED",
  500: "INTERNAL_ERROR",
};

export function statusToErrorCode(status: number): TelemetryErrorCode {
  return STATUS_TO_ERROR[status] ?? "INTERNAL_ERROR";
}

// ---- Structured Stdout Logging ----

type LogLevel = "info" | "warn" | "error";

export function structuredLog(
  level: LogLevel,
  message: string,
  fields?: Record<string, unknown>,
): void {
  const entry = {
    ts: new Date().toISOString(),
    level,
    service: "telemetry-api",
    message,
    ...fields,
  };
  process.stdout.write(JSON.stringify(entry) + "\n");
}
