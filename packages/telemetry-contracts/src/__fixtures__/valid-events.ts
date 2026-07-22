import type { TelemetryEventV1, TelemetryBatchV1 } from "../schemas/v1.js";

/** 固定会话 ID 用于测试（不影响生产轮换逻辑）。 */
const FIXED_SESSION = "sess_test01abcd";
const FIXED_TIMESTAMP = "2026-07-20T12:00:00.000Z";

function base(overrides?: Partial<TelemetryEventV1>): Partial<TelemetryEventV1> {
  return {
    schema_version: "1.0.0",
    event_id: "550e8400-e29b-41d4-a716-446655440000",
    app_id: "my-app",
    environment: "staging",
    release: "v1.2.3",
    route: "/dashboard",
    session_id: FIXED_SESSION,
    page_url: "https://example.com/dashboard",
    sdk_version: "0.1.0",
    timestamp: FIXED_TIMESTAMP,
    ...overrides,
  };
}

/** 合法的 LCP Web Vital 事件。 */
export const validLcpEvent: TelemetryEventV1 = {
  ...base(),
  event_type: "web_vital",
  vital_type: "LCP",
  value: 1234.5,
  rating: "good",
  delta: 12,
  navigation_type: "navigate",
} as TelemetryEventV1;

/** 合法的 CLS Web Vital 事件。 */
export const validClsEvent: TelemetryEventV1 = {
  ...base({ event_id: "550e8400-e29b-41d4-a716-446655440001" }),
  event_type: "web_vital",
  vital_type: "CLS",
  value: 0.05,
  rating: "good",
  delta: 0.01,
} as TelemetryEventV1;

/** 合法的 Page View 事件。 */
export const validPageViewEvent: TelemetryEventV1 = {
  ...base({ event_id: "550e8400-e29b-41d4-a716-446655440002" }),
  event_type: "page_view",
  view_type: "initial_load",
  navigation_type: "navigate",
  load_duration_ms: 2340,
} as TelemetryEventV1;

/** 合法的 Frontend Error 事件。 */
export const validErrorEvent: TelemetryEventV1 = {
  ...base({ event_id: "550e8400-e29b-41d4-a716-446655440003" }),
  event_type: "frontend_error",
  error_type: "js_error",
  message: "TypeError: Cannot read properties of undefined (reading 'id')",
  stack: "TypeError: Cannot read properties of undefined\n    at Dashboard.render (main.js:42:15)",
  filename: "https://example.com/assets/main.js",
  lineno: 42,
  colno: 15,
} as TelemetryEventV1;

/** 合法的 Frontend Log 事件。 */
export const validLogEvent: TelemetryEventV1 = {
  ...base({ event_id: "550e8400-e29b-41d4-a716-446655440004" }),
  event_type: "frontend_log",
  level: "warn",
  message: "API response slower than expected",
  attributes: { endpoint: "/api/dashboard", duration_ms: 3500 },
} as TelemetryEventV1;

/** 包含全部 4 种事件类型的合法批次。 */
export const validBatch: TelemetryBatchV1 = {
  schema_version: "1.0.0",
  sdk: { name: "@ai-ops/web-telemetry-sdk", version: "0.1.0" },
  sent_at: FIXED_TIMESTAMP,
  events: [validLcpEvent, validPageViewEvent, validErrorEvent, validLogEvent],
};
