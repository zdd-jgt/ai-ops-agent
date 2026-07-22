// ---- Re-export inferred types from schemas ----

export type {
  TelemetryEventV1,
  TenantScopedTelemetryEventV1,
  WebVitalEvent,
  PageViewEvent,
  FrontendErrorEvent,
  FrontendLogEvent,
  TelemetryBatchV1,
} from "./schemas/v1.js";

// ---- Utility types ----

/** All known event type string literals. */
export type EventType = "web_vital" | "page_view" | "frontend_error" | "frontend_log";

/** Stable, client-safe error codes returned by the ingest API. */
export type TelemetryErrorCode =
  | "OK"
  | "INVALID_SCHEMA"
  | "MISSING_REQUIRED_FIELD"
  | "FIELD_TOO_LONG"
  | "EVENT_TOO_LARGE"
  | "BATCH_TOO_LARGE"
  | "RATE_LIMITED"
  | "FORBIDDEN"
  | "INTERNAL_ERROR";

/** Per-event ingest result. */
export interface IngestEventResult {
  index: number;
  event_id: string;
  status: TelemetryErrorCode;
  detail?: string;
}

/** Batch ingest response. */
export interface IngestResponse {
  accepted: number;
  rejected: number;
  results: IngestEventResult[];
}

/** Capability report for browsers that lack certain APIs. */
export interface CapabilityStatus {
  performanceObserver: boolean;
  sendBeacon: boolean;
  lcp: boolean;
  inp: boolean;
  cls: boolean;
  fcp: boolean;
  ttfb: boolean;
}
