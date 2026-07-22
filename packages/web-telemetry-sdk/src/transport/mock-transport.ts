import type { TelemetryBatchV1, IngestResponse } from "@ai-ops/telemetry-contracts";
import type { Transport } from "./types.js";

/**
 * 基于内存数组的 Mock Transport。
 *
 * 用于本地开发和测试，不发送任何网络请求。
 * 所有发送的批次按顺序保存在 `batches` 数组中。
 */

export class MockTransport implements Transport {
  /** 所有已接收的遥测批次（按发送顺序）。 */
  readonly batches: TelemetryBatchV1[] = [];

  /** 是否模拟失败（用于测试重试/熔断逻辑）。 */
  shouldFail = false;

  /** 模拟的 HTTP 状态码（默认 200）。 */
  mockStatus = 200;

  /** 模拟限流时返回的 `Retry-After` 秒数（用于测试退避行为）。 */
  retryAfter = 5;

  /** 是否使用 `sendUnload` 发送（用于验证 sendBeacon 路径）。 */
  private unloadBatches: TelemetryBatchV1[] = [];

  async send(batch: TelemetryBatchV1): Promise<IngestResponse> {
    if (this.shouldFail) {
      return {
        accepted: 0,
        rejected: batch.events.length,
        results: batch.events.map((e, i) => ({
          index: i,
          event_id: e.event_id,
          status: this.mockStatus === 429 ? "RATE_LIMITED" : "INTERNAL_ERROR",
        })),
      };
    }

    this.batches.push(batch);

    return {
      accepted: batch.events.length,
      rejected: 0,
      results: batch.events.map((e, i) => ({
        index: i,
        event_id: e.event_id,
        status: "OK",
      })),
    };
  }

  sendUnload(batch: TelemetryBatchV1): void {
    this.unloadBatches.push(batch);
    this.batches.push(batch);
  }

  close(): void {
    // 无需释放资源
  }

  /** 返回通过 sendUnload 发送的批次（验证 sendBeacon 路径）。 */
  getUnloadBatches(): TelemetryBatchV1[] {
    return [...this.unloadBatches];
  }

  /** 重置所有状态。 */
  reset(): void {
    this.batches.length = 0;
    this.unloadBatches.length = 0;
    this.shouldFail = false;
    this.mockStatus = 200;
  }
}
