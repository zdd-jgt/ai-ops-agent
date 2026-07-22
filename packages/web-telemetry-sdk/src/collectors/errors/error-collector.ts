/**
 * 错误采集器 — 监听全局 JavaScript 错误、资源加载错误和未处理 Promise 拒绝。
 *
 * 安全约束：
 * - filename 只保留 origin + path，不包含 query/hash
 * - message 和 stack 在长度上限处截断
 * - 所有监听器包裹 try-catch，不因 SDK 失败影响业务页面
 */

import type { FrontendErrorEvent, TelemetryEventV1 } from "@ai-ops/telemetry-contracts";
import {
  sanitizeUrl,
  sanitizeError,
  sanitizeStack,
  MAX_MESSAGE_LENGTH,
  MAX_STACK_LENGTH,
  MAX_FILENAME_LENGTH,
} from "../../sanitize/sanitizer.js";

// ---- Types ----

export interface ErrorCollectorContext {
  /** 事件就绪回调 — 采集器组装事件后通过此回调传递给缓冲/传输层。 */
  onEvent: (event: TelemetryEventV1) => void;

  /** 应用标识。 */
  appId: string;

  /** 环境标识（如 "production"）。 */
  environment: string;

  /** 发布版本号。 */
  release: string;

  /** SDK 版本号。 */
  sdkVersion: string;

  /** 获取当前匿名会话 ID。 */
  getSessionId: () => string;

  /** 获取当前标准化路由模板。 */
  getRoute: () => string;

  /** 获取当前页面 URL（原始值，采集器内部脱敏）。 */
  getPageUrl: () => string;
}

// ---- ErrorCollector ----

export class ErrorCollector {
  private ctx: ErrorCollectorContext;
  private _started = false;

  // 已绑定的处理器引用（用于 stop() 时移除监听）
  private boundHandleError: (event: Event) => void;
  private boundHandleRejection: (event: PromiseRejectionEvent) => void;

  constructor(ctx: ErrorCollectorContext) {
    this.ctx = ctx;
    this.boundHandleError = this.handleErrorEvent.bind(this);
    this.boundHandleRejection = this.handleUnhandledRejection.bind(this);
  }

  /** 是否已启动。 */
  get started(): boolean {
    return this._started;
  }

  /** 启动采集 — 注册全局事件监听器。可在初始化后随时调用。 */
  start(): void {
    if (this._started) return;
    this._started = true;

    // error 事件在捕获阶段监听，同时捕获 JS Error 和资源加载错误
    window.addEventListener("error", this.boundHandleError, true);
    window.addEventListener("unhandledrejection", this.boundHandleRejection);
  }

  /** 停止采集 — 移除全局事件监听器。 */
  stop(): void {
    if (!this._started) return;
    this._started = false;

    window.removeEventListener("error", this.boundHandleError, true);
    window.removeEventListener("unhandledrejection", this.boundHandleRejection);
  }

  // ---- 事件处理器 ----

  private handleErrorEvent(event: Event): void {
    try {
      if (event instanceof ErrorEvent) {
        // JavaScript 运行时错误
        this.captureJsError(event);
      } else if (event.target instanceof Element) {
        // 资源加载错误（script / img / link / source 等）
        this.captureResourceError(event);
      }
    } catch {
      // SDK 失败不影响业务页面 — 静默忽略
    }
  }

  private handleUnhandledRejection(event: PromiseRejectionEvent): void {
    try {
      this.captureRejection(event);
    } catch {
      // 静默忽略
    }
  }

  // ---- 各类错误捕获 ----

  private captureJsError(event: ErrorEvent): void {
    const error = event.error as Error | undefined;
    const rawMessage = error?.message || event.message || "Unknown script error";
    const rawStack = error?.stack;

    const message = sanitizeError(rawMessage, MAX_MESSAGE_LENGTH);
    const stack = rawStack ? sanitizeStack(rawStack, MAX_STACK_LENGTH) : undefined;
    const filename = event.filename
      ? sanitizeRelativeUrl(event.filename).slice(0, MAX_FILENAME_LENGTH)
      : undefined;

    const evt: FrontendErrorEvent = {
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

      event_type: "frontend_error",
      error_type: "js_error",
      message,
      stack,
      filename,
      lineno: event.lineno > 0 ? event.lineno : undefined,
      colno: event.colno > 0 ? event.colno : undefined,
    } as unknown as FrontendErrorEvent;

    this.ctx.onEvent(evt as TelemetryEventV1);
  }

  private captureResourceError(event: Event): void {
    const target = event.target as Element;
    const resourceUrl = extractResourceUrl(target);
    const resourceType = deriveResourceType(target);

    const message = sanitizeError(
      `Failed to load resource: ${resourceType || "unknown"}`,
      MAX_MESSAGE_LENGTH,
    );

    const evt: FrontendErrorEvent = {
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

      event_type: "frontend_error",
      error_type: "resource_error",
      message,
      resource_url: resourceUrl ? sanitizeUrl(resourceUrl).slice(0, 2048) : undefined,
      resource_type: resourceType,
    } as unknown as FrontendErrorEvent;

    this.ctx.onEvent(evt as TelemetryEventV1);
  }

  private captureRejection(event: PromiseRejectionEvent): void {
    const reason = event.reason;
    let rawMessage: string;
    let rawStack: string | undefined;

    if (reason instanceof Error) {
      rawMessage = reason.message || "Unhandled Promise Rejection";
      rawStack = reason.stack;
    } else if (typeof reason === "string") {
      rawMessage = reason;
      rawStack = undefined;
    } else if (reason !== null && reason !== undefined) {
      try {
        rawMessage = String(reason);
      } catch {
        rawMessage = "Unhandled Promise Rejection";
      }
      rawStack = undefined;
    } else {
      rawMessage = "Unhandled Promise Rejection";
      rawStack = undefined;
    }

    const message = sanitizeError(rawMessage, MAX_MESSAGE_LENGTH);
    const stack = rawStack ? sanitizeStack(rawStack, MAX_STACK_LENGTH) : undefined;

    const evt: FrontendErrorEvent = {
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

      event_type: "frontend_error",
      error_type: "unhandled_rejection",
      message,
      stack,
    } as unknown as FrontendErrorEvent;

    this.ctx.onEvent(evt as TelemetryEventV1);
  }
}

// ---- Helpers ----

/**
 * 处理可能出现相对路径的 URL（如错误事件中的 filename），
 * 使用当前页面 origin 进行解析以保持一致性。
 */
function sanitizeRelativeUrl(rawUrl: string): string {
  // 如果已经是绝对 URL，直接脱敏
  if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://") || rawUrl.startsWith("//")) {
    return sanitizeUrl(rawUrl);
  }
  // 相对路径 — 拼接当前 origin 后再脱敏
  try {
    const resolved = new URL(rawUrl, window.location.origin);
    return sanitizeUrl(resolved.href);
  } catch {
    return sanitizeUrl(rawUrl);
  }
}

/** 从资源加载错误的目标元素提取资源 URL。 */
function extractResourceUrl(target: Element): string | undefined {
  if (
    target instanceof HTMLScriptElement ||
    target instanceof HTMLImageElement ||
    target instanceof HTMLSourceElement ||
    target instanceof HTMLAudioElement ||
    target instanceof HTMLVideoElement ||
    target instanceof HTMLTrackElement
  ) {
    return target.src || undefined;
  }
  if (target instanceof HTMLLinkElement) {
    return target.href || target.baseURI || undefined;
  }
  // iframe 加载错误
  if (target instanceof HTMLIFrameElement) {
    return target.src || undefined;
  }
  return undefined;
}

/** 从目标元素推断资源类型。 */
function deriveResourceType(target: Element): string | undefined {
  if (target instanceof HTMLScriptElement) return "script";
  if (target instanceof HTMLImageElement) return "image";
  if (target instanceof HTMLLinkElement) return "stylesheet";
  if (target instanceof HTMLSourceElement || target instanceof HTMLVideoElement || target instanceof HTMLAudioElement) {
    return "media";
  }
  if (target instanceof HTMLIFrameElement) return "iframe";
  // 通过标签名兜底
  const tag = target.tagName.toLowerCase();
  if (tag === "link") return "stylesheet";
  if (["img", "image"].includes(tag)) return "image";
  if (tag === "script") return "script";
  return tag;
}
