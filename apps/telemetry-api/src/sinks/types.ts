import type { TenantScopedTelemetryEventV1 } from "@ai-ops/telemetry-contracts";

/**
 * Sink 接口 — 清洗后的事件写入目标。
 *
 * 实现：
 * - `StdoutSink` — 单行 JSON → stdout → ECS awslogs → CloudWatch Logs
 * - `LocalFileSink` — 本地文件（开发/调试用）
 */
export interface Sink {
  readonly name: string;

  /** 写入单个事件。失败时抛异常，由调用方决定重试或丢弃。 */
  write(event: TenantScopedTelemetryEventV1): void;

  /** 批量写入事件。默认实现逐条调用 write()。 */
  writeBatch?(events: TenantScopedTelemetryEventV1[]): void;

  /** 关闭 Sink，释放文件句柄等资源。 */
  close(): void;
}

/** 复合 Sink — 同时写入多个 Sink（如 stdout + local 双写）。 */
export class CompositeSink implements Sink {
  readonly name = "composite";

  constructor(private sinks: Sink[]) {}

  write(event: TenantScopedTelemetryEventV1): void {
    for (const sink of this.sinks) {
      try {
        sink.write(event);
      } catch (err) {
        // 一个 Sink 失败不影响其他
        const msg = err instanceof Error ? err.message : String(err);
        process.stderr.write(JSON.stringify({ ts: new Date().toISOString(), level: "error", service: "telemetry-api", sink: sink.name, message: msg }) + "\n");
      }
    }
  }

  writeBatch(events: TenantScopedTelemetryEventV1[]): void {
    for (const sink of this.sinks) {
      try {
        if (sink.writeBatch) {
          sink.writeBatch(events);
        } else {
          for (const event of events) {
            sink.write(event);
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        process.stderr.write(JSON.stringify({ ts: new Date().toISOString(), level: "error", service: "telemetry-api", sink: sink.name, message: msg }) + "\n");
      }
    }
  }

  close(): void {
    for (const sink of this.sinks) {
      try { sink.close(); } catch { /* ignore */ }
    }
  }
}
