import type { TelemetryEventV1 } from "@ai-ops/telemetry-contracts";
import type { TelemetryConfig } from "./config.js";

/**
 * 事件缓冲区。
 *
 * 在内存中缓存事件，支持按数量、体积大小和时间触发 Flush。
 * 当缓冲区满时，按配置丢弃低优先级事件（`frontend_log` >
 * `page_view` > `web_vital` > `frontend_error`）。
 */

interface BufferedEvent {
  event: TelemetryEventV1;
  estimatedBytes: number;
}

export interface BufferSnapshot {
  events: TelemetryEventV1[];
  droppedCount: number;
  totalBytes: number;
}

export class EventBuffer {
  private buffer: BufferedEvent[] = [];
  private droppedCount = 0;
  private totalBytes = 0;

  constructor(private config: TelemetryConfig) {}

  /** 添加事件到缓冲区。返回因满溢被丢弃的事件数。 */
  push(event: TelemetryEventV1): number {
    const estimatedBytes = estimateEventBytes(event);

    // 单事件体积检查
    if (estimatedBytes > this.config.eventMaxBytes) {
      this.droppedCount++;
      return 1;
    }

    // 缓冲区满 — 按优先级丢弃
    let dropped = 0;
    while (
      this.buffer.length >= this.config.bufferMaxEvents ||
      this.totalBytes + estimatedBytes > this.config.batchMaxBytes * 2 // 允许 2x batch 在缓冲中
    ) {
      const evicted = this.evictLowestPriority();
      if (!evicted) break; // 不应发生
      dropped++;
    }

    this.buffer.push({ event, estimatedBytes });
    this.totalBytes += estimatedBytes;
    return dropped;
  }

  /** 取出事件组成批次（最多 batchMaxEvents 或 batchMaxBytes）。 */
  drain(): BufferSnapshot {
    const batch: BufferedEvent[] = [];
    let batchBytes = 0;

    while (this.buffer.length > 0) {
      const next = this.buffer[0]!;
      if (
        batch.length >= this.config.batchMaxEvents ||
        batchBytes + next.estimatedBytes > this.config.batchMaxBytes
      ) {
        break;
      }
      batch.push(this.buffer.shift()!);
      batchBytes += next.estimatedBytes;
    }

    this.totalBytes -= batchBytes;

    return {
      events: batch.map((b) => b.event),
      droppedCount: this.droppedCount,
      totalBytes: batchBytes,
    };
  }

  /** 当前缓冲区事件数。 */
  get size(): number {
    return this.buffer.length;
  }

  /** 是否已达到数量或体积阈值，需要立即 Flush。 */
  get shouldFlush(): boolean {
    return this.buffer.length >= this.config.batchMaxEvents || this.totalBytes >= this.config.batchMaxBytes;
  }

  /** 总丢弃数（自上次 `drain` 以来不清零，需调用方管理）。 */
  get dropped(): number {
    return this.droppedCount;
  }

  /** 清空并丢弃所有事件。 */
  clear(): void {
    this.buffer = [];
    this.totalBytes = 0;
  }

  /** 重置丢弃计数。 */
  resetDropped(): void {
    this.droppedCount = 0;
  }

  // ---- private helpers ----

  private evictLowestPriority(): BufferedEvent | null {
    // 丢弃优先级：frontend_log (4) > page_view (3) > web_vital (2) > frontend_error (1)
    const priority: Record<string, number> = {
      frontend_log: 4,
      page_view: 3,
      web_vital: 2,
      frontend_error: 1,
    };

    let lowestIdx = -1;
    let lowestPrio = -1;

    for (let i = 0; i < this.buffer.length; i++) {
      const p = priority[this.buffer[i]!.event.event_type] ?? 5;
      if (p > lowestPrio) {
        lowestPrio = p;
        lowestIdx = i;
      }
    }

    if (lowestIdx >= 0) {
      const evicted = this.buffer[lowestIdx]!;
      this.buffer.splice(lowestIdx, 1);
      this.totalBytes -= evicted.estimatedBytes;
      this.droppedCount++;
      return evicted;
    }

    return null;
  }
}

/** 粗略估算事件 JSON 序列化体积。 */
function estimateEventBytes(event: TelemetryEventV1): number {
  // 简单 JSON 序列化长度估算；生产环境可优化为更精确的 byte counter
  try {
    return new TextEncoder().encode(JSON.stringify(event)).length;
  } catch {
    return 2048; // 保守默认
  }
}
