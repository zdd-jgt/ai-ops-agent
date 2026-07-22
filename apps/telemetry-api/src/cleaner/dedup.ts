/**
 * 批次内去重 — 基于事件指纹。
 *
 * 指纹 = `${event_type}:${route}:${message}` 的 SHA-256 前 16 字符。
 * 同一批次中相同指纹的事件只保留第一个。
 */

import type { TelemetryEventV1 } from "@ai-ops/telemetry-contracts";
import crypto from "node:crypto";

/** 构建事件指纹（不包含 event_id，因为它是唯一的）。 */
export function eventFingerprint(event: TelemetryEventV1): string {
  const msg = "message" in event ? (event.message as string) : "";
  const stack = "stack" in event ? (event.stack as string) : "";
  const key = `${event.event_type}|${event.route}|${msg.slice(0, 100)}|${stack.slice(0, 100)}`;

  return crypto.createHash("sha256").update(key).digest("hex").slice(0, 16);
}

export interface DedupResult {
  events: TelemetryEventV1[];
  originalIndices: number[];
  duplicatesRemoved: number;
}

/** 对事件数组去重，保持原始顺序。 */
export function deduplicateBatch(events: TelemetryEventV1[]): DedupResult {
  const seen = new Set<string>();
  const unique: TelemetryEventV1[] = [];
  const originalIndices: number[] = [];
  let duplicatesRemoved = 0;

  for (const [index, event] of events.entries()) {
    const fp = eventFingerprint(event);
    if (seen.has(fp)) {
      duplicatesRemoved++;
    } else {
      seen.add(fp);
      unique.push(event);
      originalIndices.push(index);
    }
  }

  return { events: unique, originalIndices, duplicatesRemoved };
}
