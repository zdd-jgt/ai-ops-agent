/**
 * Web Vitals 采集器
 *
 * 使用 `web-vitals` 库采集 LCP、INP、CLS、FCP、TTFB 五个核心指标，
 * 每个指标转换为 {@link import("@ai-ops/telemetry-contracts").WebVitalEvent}
 * 并通过 `onEvent` 回调传递给上层。
 *
 * 不支持的浏览器 API 优雅降级（不抛异常），`start()` 返回
 * {@link import("@ai-ops/telemetry-contracts").CapabilityStatus} 报告能力状态。
 *
 * @remarks
 * `stop()` 设置内部标志使已注册的回调不再上报事件。web-vitals v4 的 `on*`
 * 函数不返回 unsubscribe 句柄，但会在指标最终确定后自行清理内部 observer。
 */

import { onCLS, onFCP, onINP, onLCP, onTTFB } from "web-vitals";
import type { Metric } from "web-vitals";
import type { CapabilityStatus, TelemetryEventV1 } from "@ai-ops/telemetry-contracts";
import {
  buildCommonFields,
  checkCapabilityStatus,
  normalizeNavigationType,
  type CollectorContext,
} from "./context.js";

// ---- Types ----

/**
 * Constructs the collection of web-vitals `on*` handler references.
 * Used by {@link VitalsCollector.tryRegister} for type-safe dispatch.
 */
interface VitalHandlers {
  lcp: typeof onLCP;
  inp: typeof onINP;
  cls: typeof onCLS;
  fcp: typeof onFCP;
  ttfb: typeof onTTFB;
}

/**
 * Map web-vitals metric name to our schema's `vital_type` enum.
 */
const VITAL_TYPE_MAP: Record<string, "LCP" | "INP" | "CLS" | "FCP" | "TTFB"> = {
  LCP: "LCP",
  INP: "INP",
  CLS: "CLS",
  FCP: "FCP",
  TTFB: "TTFB",
};

// ---- Collector ----

/**
 * Collects Web Vitals (LCP, INP, CLS, FCP, TTFB) and emits
 * {@link TelemetryEventV1} events with `event_type: "web_vital"`.
 */
export class VitalsCollector {
  /** Guard flag — when set, callbacks are no-oped. */
  private stopped = false;

  /**
   * @param ctx       Shared collector context (config, accessors).
   * @param onEvent   Callback invoked with each collected event.
   */
  constructor(
    private ctx: CollectorContext,
    private onEvent: (event: TelemetryEventV1) => void,
  ) {}

  /**
   * Start collecting all five Web Vitals.
   *
   * Metrics that require an unsupported browser API are silently skipped.
   * Returns a {@link CapabilityStatus} describing what the current browser
   * supports. This is safe to call even when `disabled` is true.
   */
  start(): CapabilityStatus {
    if (this.ctx.disabled) {
      return checkCapabilityStatus();
    }

    const hasPO = typeof PerformanceObserver !== "undefined";

    this.tryRegister("lcp", onLCP, hasPO);
    this.tryRegister("inp", onINP, hasPO);
    this.tryRegister("cls", onCLS, hasPO);
    this.tryRegister("fcp", onFCP, hasPO);
    this.tryRegister("ttfb", onTTFB, true);

    return checkCapabilityStatus();
  }

  /**
   * Stop collecting Web Vitals.
   *
   * Sets a flag that causes already-registered callbacks to be ignored.
   * web-vitals' internal observers are self-cleaning once a metric finalises,
   * so no explicit observer disconnection is needed.
   */
  stop(): void {
    this.stopped = true;
  }

  // ---- Private helpers ----

  /**
   * Attempt to register a single web-vital listener.
   * Failures (e.g. missing browser API, web-vitals not installed) are silently
   * caught — the metric is simply not collected.
   */
  private tryRegister(
    _type: keyof VitalHandlers,
    handler: VitalHandlers[keyof VitalHandlers],
    apiAvailable: boolean,
  ): void {
    if (!apiAvailable) return;

    try {
      handler((metric: Metric) => {
        if (this.stopped) return;
        this.handleMetric(metric);
      });
    } catch {
      // Gracefully degrade — registration failed for this metric
    }
  }

  /** Convert an incoming web-vital metric into a TelemetryEventV1. */
  private handleMetric(metric: Metric): void {
    const vitalType = VITAL_TYPE_MAP[metric.name];
    if (!vitalType) return;

    const navigationType = normalizeNavigationType(
      metric.navigationType,
    );
    const base = buildCommonFields(this.ctx);

    const event: TelemetryEventV1 = {
      ...base,
      event_type: "web_vital",
      vital_type: vitalType,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      ...(navigationType ? { navigation_type: navigationType } : {}),
    } as unknown as TelemetryEventV1;

    this.onEvent(event);
  }
}

export { checkCapabilityStatus };
