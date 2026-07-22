import { z } from "zod";

// ---- Constants ----

export const SCHEMA_VERSION = "1.0.0" as const;

const EVENT_TYPES = ["web_vital", "page_view", "frontend_error", "frontend_log"] as const;

const VITAL_TYPES = ["LCP", "INP", "CLS", "FCP", "TTFB"] as const;

const RATINGS = ["good", "needs-improvement", "poor"] as const;

const VIEW_TYPES = ["initial_load", "route_change"] as const;

const NAVIGATION_TYPES = ["navigate", "reload", "back-forward", "prerender"] as const;

const ERROR_TYPES = ["js_error", "resource_error", "unhandled_rejection"] as const;

const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;

// ---- Limits ----

export const MAX_ROUTE_LENGTH = 256;
export const MAX_MESSAGE_LENGTH = 1024;
export const MAX_STACK_LENGTH = 4096;
export const MAX_FILENAME_LENGTH = 512;
export const MAX_ATTRIBUTES_COUNT = 20;
export const MAX_ATTRIBUTE_KEY_LENGTH = 64;
export const MAX_ATTRIBUTE_VALUE_LENGTH = 256;

// ---- Common envelope fields ----

const CommonFields = z.object({
  /** Schema 版本号，固定 "1.0.0" */
  schema_version: z.literal(SCHEMA_VERSION),

  /** 事件唯一 ID（UUID v7 风格） */
  event_id: z.string().uuid(),

  /** 应用标识 */
  app_id: z.string().min(1).max(128),

  /** 环境标识（如 "production", "staging"） */
  environment: z.string().min(1).max(64),

  /** 发布版本号 */
  release: z.string().min(1).max(128),

  /** 标准化路由模板（不含 Query 和 Hash） */
  route: z.string().max(MAX_ROUTE_LENGTH),

  /** 匿名会话 ID（短期轮换，不与真实用户 ID 绑定） */
  session_id: z.string().min(1).max(128),

  /** 页面 URL（仅 origin + path，已由 SDK 脱敏） */
  page_url: z.string().max(2048),

  /** SDK 名称与版本 */
  sdk_version: z.string().min(1).max(64),

  /** 事件产生时间（UTC ISO-8601） */
  timestamp: z.string().datetime(),
});

// ---- Web Vital ----

export const WebVitalEventSchema = CommonFields.extend({
  event_type: z.literal("web_vital"),

  /** 指标类型 */
  vital_type: z.enum(VITAL_TYPES),

  /** 指标值 */
  value: z.number().finite(),

  /** Web Vitals 评级 */
  rating: z.enum(RATINGS),

  /** 相对于上一次报告的变化量 */
  delta: z.number().finite(),

  /** 导航类型 */
  navigation_type: z.enum(NAVIGATION_TYPES).optional(),
});

export type WebVitalEvent = z.infer<typeof WebVitalEventSchema>;

// ---- Page View ----

export const PageViewEventSchema = CommonFields.extend({
  event_type: z.literal("page_view"),

  /** 视图类型 */
  view_type: z.enum(VIEW_TYPES),

  /** 导航类型 */
  navigation_type: z.enum(NAVIGATION_TYPES).optional(),

  /** 页面加载耗时（毫秒），仅 initial_load 时有值 */
  load_duration_ms: z.number().finite().nonnegative().optional(),

  /** 上一个路由模板（route_change 时有值） */
  previous_route: z.string().max(MAX_ROUTE_LENGTH).optional(),
});

export type PageViewEvent = z.infer<typeof PageViewEventSchema>;

// ---- Frontend Error ----

export const FrontendErrorEventSchema = CommonFields.extend({
  event_type: z.literal("frontend_error"),

  /** 错误子类型 */
  error_type: z.enum(ERROR_TYPES),

  /** 错误消息（已截断） */
  message: z.string().max(MAX_MESSAGE_LENGTH),

  /** 错误堆栈（已截断） */
  stack: z.string().max(MAX_STACK_LENGTH).optional(),

  /** 出错文件名 */
  filename: z.string().max(MAX_FILENAME_LENGTH).optional(),

  /** 出错行号 */
  lineno: z.number().int().nonnegative().optional(),

  /** 出错列号 */
  colno: z.number().int().nonnegative().optional(),

  /** 资源加载错误的目标 URL */
  resource_url: z.string().max(2048).optional(),

  /** 资源类型（script/image/stylesheet 等） */
  resource_type: z.string().max(64).optional(),
});

export type FrontendErrorEvent = z.infer<typeof FrontendErrorEventSchema>;

// ---- Frontend Log ----

export const FrontendLogEventSchema = CommonFields.extend({
  event_type: z.literal("frontend_log"),

  /** 日志级别 */
  level: z.enum(LOG_LEVELS),

  /** 日志消息 */
  message: z.string().max(MAX_MESSAGE_LENGTH),

  /** 附加属性（已脱敏，仅白名单 key 允许） */
  attributes: z
    .record(
      z.string().max(MAX_ATTRIBUTE_KEY_LENGTH),
      z.union([z.string().max(MAX_ATTRIBUTE_VALUE_LENGTH), z.number(), z.boolean(), z.null()])
    )
    .refine((obj) => Object.keys(obj).length <= MAX_ATTRIBUTES_COUNT, {
      message: `事件属性最多 ${MAX_ATTRIBUTES_COUNT} 个`,
    })
    .optional(),
});

export type FrontendLogEvent = z.infer<typeof FrontendLogEventSchema>;

// ---- Union ----

export const TelemetryEventV1Schema = z.discriminatedUnion("event_type", [
  WebVitalEventSchema,
  PageViewEventSchema,
  FrontendErrorEventSchema,
  FrontendLogEventSchema,
]);

export type TelemetryEventV1 = z.infer<typeof TelemetryEventV1Schema>;

/** 服务端完成认证和接入后持久化的租户作用域事件。 */
export type TenantScopedTelemetryEventV1 = TelemetryEventV1 & {
  tenant_id: string;
  received_at: string;
  ingest_id: string;
};


// ---- Batch ----

export const TelemetryBatchV1Schema = z.object({
  schema_version: z.literal(SCHEMA_VERSION),

  sdk: z.object({
    name: z.string().min(1).max(64),
    version: z.string().min(1).max(64),
  }),

  sent_at: z.string().datetime(),

  events: z
    .array(TelemetryEventV1Schema)
    .min(1, "批次至少包含 1 个事件")
    .max(500, "批次最多 500 个事件"),
});

export type TelemetryBatchV1 = z.infer<typeof TelemetryBatchV1Schema>;
