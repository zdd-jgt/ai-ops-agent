/**
 * 稳定错误码枚举。
 *
 * 所有遥测接入 API 返回的逐事件状态必须使用以下错误码之一。
 * SDK 根据错误码决定重试、丢弃或熔断策略。
 */
export const ErrorCode = {
  OK: "OK",
  INVALID_SCHEMA: "INVALID_SCHEMA",
  MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",
  FIELD_TOO_LONG: "FIELD_TOO_LONG",
  EVENT_TOO_LARGE: "EVENT_TOO_LARGE",
  BATCH_TOO_LARGE: "BATCH_TOO_LARGE",
  RATE_LIMITED: "RATE_LIMITED",
  FORBIDDEN: "FORBIDDEN",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/** 不可重试的错误码 — SDK 收到后应丢弃事件且不重试。 */
export const NON_RETRYABLE: ReadonlySet<ErrorCode> = new Set([
  ErrorCode.INVALID_SCHEMA,
  ErrorCode.MISSING_REQUIRED_FIELD,
  ErrorCode.FIELD_TOO_LONG,
  ErrorCode.EVENT_TOO_LARGE,
  ErrorCode.FORBIDDEN,
]);

/** 可重试的错误码 — SDK 应按照退避策略重试。 */
export const RETRYABLE: ReadonlySet<ErrorCode> = new Set([
  ErrorCode.RATE_LIMITED,
  ErrorCode.INTERNAL_ERROR,
]);

/** 错误码对应的默认用户提示（不泄露内部细节）。 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.OK]: "OK",
  [ErrorCode.INVALID_SCHEMA]: "事件格式不符合 Schema",
  [ErrorCode.MISSING_REQUIRED_FIELD]: "缺少必填字段",
  [ErrorCode.FIELD_TOO_LONG]: "字段超出长度限制",
  [ErrorCode.EVENT_TOO_LARGE]: "事件体积超过上限",
  [ErrorCode.BATCH_TOO_LARGE]: "批次体积超过上限",
  [ErrorCode.RATE_LIMITED]: "请求过于频繁，请稍后重试",
  [ErrorCode.FORBIDDEN]: "无权写入该 Endpoint",
  [ErrorCode.INTERNAL_ERROR]: "服务内部错误",
};
