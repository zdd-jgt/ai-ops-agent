/**
 * 事件标准化 — 确保所有字段符合 Schema 约束后再进入 Sink。
 */

import type { TelemetryEventV1 } from "@ai-ops/telemetry-contracts";
import { sanitizeUrl, truncate, containsForbiddenPattern } from "./sanitizer.js";

export interface NormalizeResult {
  event: TelemetryEventV1;
  sanitized: boolean;
}

/**
 * 标准化单个事件：
 * - route / page_url 脱敏（去 Query/Hash）
 * - message / stack 截断
 * - 检查禁止字段
 * - 时间戳格式归一化
 */
export function normalizeEvent(event: TelemetryEventV1): NormalizeResult {
  let sanitized = false;

  // URL 脱敏
  const cleanRoute = sanitizeUrl(event.route);
  const cleanPageUrl = sanitizeUrl(event.page_url || "");
  if (cleanRoute !== event.route || cleanPageUrl !== event.page_url) {
    sanitized = true;
  }

  // message 截断（适用于 frontend_error / frontend_log）
  if ("message" in event && typeof event.message === "string") {
    const truncated = truncate(event.message as string, 1024);
    if (truncated !== event.message) {
      (event as Record<string, unknown>)["message"] = truncated;
      sanitized = true;
    }
  }

  // stack 截断
  if ("stack" in event && typeof event.stack === "string") {
    const truncated = truncate(event.stack as string, 4096);
    if (truncated !== event.stack) {
      (event as Record<string, unknown>)["stack"] = truncated;
      sanitized = true;
    }
  }

  // attributes 检查（frontend_log）
  if ("attributes" in event && event["attributes"]) {
    const attrs = event["attributes"] as Record<string, unknown>;
    for (const key of Object.keys(attrs)) {
      const value = attrs[key];
      if (typeof value === "string" && containsForbiddenPattern(value)) {
        delete attrs[key];
        sanitized = true;
      }
    }
  }

  // 归一化时间戳（确保毫秒部分统一）
  const ts = new Date(event.timestamp);
  if (!isNaN(ts.getTime())) {
    const cleanTs = ts.toISOString();
    if (cleanTs !== event.timestamp) {
      (event as Record<string, unknown>)["timestamp"] = cleanTs;
      sanitized = true;
    }
  }

  return {
    event: {
      ...event,
      route: cleanRoute,
      page_url: cleanPageUrl,
    },
    sanitized,
  };
}
