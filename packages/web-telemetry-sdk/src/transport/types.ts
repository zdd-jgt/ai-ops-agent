import type { TelemetryBatchV1, IngestResponse } from "@ai-ops/telemetry-contracts";

/**
 * Transport 接口 — SDK 通过此接口发送遥测批次。
 *
 * 内建实现：
 * - `FetchTransport` — 生产环境使用 fetch + sendBeacon
 * - `MockTransport` — 测试/本地开发使用内存数组
 *
 * 接入方可以提供自定义 Transport（如写入自定义日志管道）。
 */
export interface Transport {
  /** 发送一个遥测批次。 */
  send(batch: TelemetryBatchV1): Promise<IngestResponse>;

  /** 页面卸载时发送（应使用 sendBeacon / keepalive，不依赖 Promise）。 */
  sendUnload(batch: TelemetryBatchV1): void;

  /** 关闭 Transport，释放资源。 */
  close(): void;
}
