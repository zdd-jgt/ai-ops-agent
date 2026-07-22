// 版本化 Schema
export {
  SCHEMA_VERSION,
  TelemetryEventV1Schema,
  WebVitalEventSchema,
  PageViewEventSchema,
  FrontendErrorEventSchema,
  FrontendLogEventSchema,
  TelemetryBatchV1Schema,
} from "./schemas/v1.js";

export {
  MAX_ROUTE_LENGTH,
  MAX_MESSAGE_LENGTH,
  MAX_STACK_LENGTH,
  MAX_FILENAME_LENGTH,
  MAX_ATTRIBUTES_COUNT,
  MAX_ATTRIBUTE_KEY_LENGTH,
  MAX_ATTRIBUTE_VALUE_LENGTH,
} from "./schemas/v1.js";

export type {
  TelemetryEventV1,
  TenantScopedTelemetryEventV1,
  WebVitalEvent,
  PageViewEvent,
  FrontendErrorEvent,
  FrontendLogEvent,
  TelemetryBatchV1,
} from "./schemas/v1.js";

// 类型定义
export type {
  EventType,
  TelemetryErrorCode,
  IngestEventResult,
  IngestResponse,
  CapabilityStatus,
} from "./types.js";

// 错误码
export { ErrorCode, NON_RETRYABLE, RETRYABLE, ERROR_MESSAGES } from "./error-codes.js";
