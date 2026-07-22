import type { TenantScopedTelemetryEventV1 } from "@ai-ops/telemetry-contracts";
import type { Sink } from "./types.js";

/**
 * Stdout Sink — 单行版本化 JSON 输出。
 *
 * ECS Fargate 通过 awslogs 驱动自动收集 stdout 并写入 CloudWatch Logs。
 * 每个事件一行 JSON，包含 `_ds`（数据来源标记）和 `event` 字段。
 */
export class StdoutSink implements Sink {
  readonly name = "stdout";

  write(event: TenantScopedTelemetryEventV1): void {
    const line = JSON.stringify({
      _ds: "telemetry-event",
      _v: "1.0.0",
      ts: event.timestamp,
      tenant_id: event.tenant_id,
      event_type: event.event_type,
      event_id: event.event_id,
      app_id: event.app_id,
      route: event.route,
      event,
    });
    process.stdout.write(line + "\n");
  }

  writeBatch(events: TenantScopedTelemetryEventV1[]): void {
    for (const event of events) {
      this.write(event);
    }
  }

  close(): void {
    // stdout 不关闭
  }
}
