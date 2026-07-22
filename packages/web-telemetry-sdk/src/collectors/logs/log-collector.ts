/**
 * 显式日志采集器 — 提供 `log()` 方法生成结构化的 FrontendLogEvent。
 *
 * 安全约束：
 * - 所有属性通过 sanitizeAttributes 脱敏（白名单过滤 + 禁止字段检测）
 * - 属性数量 ≤20，key ≤64 字符，value ≤256 字符
 * - 所有路径包裹 try-catch，不向业务抛异常
 */

import type { FrontendLogEvent, TelemetryEventV1 } from "@ai-ops/telemetry-contracts";
import {
  sanitizeAttributes,
  sanitizeError,
  sanitizeUrl,
  MAX_MESSAGE_LENGTH,
} from "../../sanitize/sanitizer.js";

// ---- Types ----

/** 支持的日志级别（与 telemetry-contracts schema 保持一致）。 */
export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogCollectorContext {
  /** 事件就绪回调。 */
  onEvent: (event: TelemetryEventV1) => void;

  /** 应用标识。 */
  appId: string;

  /** 环境标识。 */
  environment: string;

  /** 发布版本号。 */
  release: string;

  /** SDK 版本号。 */
  sdkVersion: string;

  /** 获取当前匿名会话 ID。 */
  getSessionId: () => string;

  /** 获取当前标准化路由模板。 */
  getRoute: () => string;

  /** 获取当前页面 URL（原始值）。 */
  getPageUrl: () => string;

  /**
   * 可选属性白名单 — 如果设置，只有白名单中的 key 会出现在发送的 attributes 中。
   * 未设置时允许所有 key（但仍会进行禁止字段检测和类型/长度限制）。
   */
  allowedAttributes?: Set<string>;
}

// ---- LogCollector ----

export class LogCollector {
  private ctx: LogCollectorContext;

  constructor(ctx: LogCollectorContext) {
    this.ctx = ctx;
  }

  /**
   * 记录一条显式日志。
   *
   * @param level   - 日志级别
   * @param message - 日志消息
   * @param attributes - 附加属性（可选，会自动脱敏）
   */
  log(level: LogLevel, message: string, attributes?: Record<string, unknown>): void {
    try {
      const sanitizedMessage = sanitizeError(message, MAX_MESSAGE_LENGTH);
      let sanitizedAttrs: Record<string, unknown> | undefined;

      if (attributes && typeof attributes === "object") {
        sanitizedAttrs = sanitizeAttributes(attributes, this.ctx.allowedAttributes);
        // 如果脱敏后为空对象，转为 undefined 以省略字段
        if (Object.keys(sanitizedAttrs).length === 0) {
          sanitizedAttrs = undefined;
        }
      }

      const evt: FrontendLogEvent = {
        schema_version: "1.0.0",
        event_id: crypto.randomUUID(),
        app_id: this.ctx.appId,
        environment: this.ctx.environment,
        release: this.ctx.release,
        route: this.ctx.getRoute(),
        session_id: this.ctx.getSessionId(),
        page_url: sanitizeUrl(this.ctx.getPageUrl()),
        sdk_version: this.ctx.sdkVersion,
        timestamp: new Date().toISOString(),

        event_type: "frontend_log",
        level,
        message: sanitizedMessage,
        ...(sanitizedAttrs ? { attributes: sanitizedAttrs } : {}),
      } as unknown as FrontendLogEvent;

      this.ctx.onEvent(evt as TelemetryEventV1);
    } catch {
      // SDK 失败不影响业务页面 — 静默忽略
    }
  }
}
