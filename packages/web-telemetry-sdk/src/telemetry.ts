/**
 * initTelemetry — 一键初始化 SDK，启动所有采集器 + 缓冲 + 传输。
 */
import type { TelemetryConfig } from "./core/config.js";
import { resolveConfig } from "./core/config.js";
import { EventBuffer } from "./core/buffer.js";
import { FlushScheduler } from "./core/scheduler.js";
import { FetchTransport } from "./transport/fetch-transport.js";
import { ErrorCollector } from "./collectors/errors/error-collector.js";
import type { ErrorCollectorContext } from "./collectors/errors/index.js";
import { LogCollector } from "./collectors/logs/log-collector.js";
import type { LogCollectorContext, LogLevel } from "./collectors/logs/index.js";
import { VitalsCollector } from "./collectors/performance/vitals-collector.js";
import { PageViewCollector } from "./collectors/performance/page-view-collector.js";
import type { CollectorContext } from "./collectors/performance/index.js";
import { sanitizeUrl } from "./sanitize/sanitizer.js";
import type { TelemetryBatchV1, TelemetryEventV1 } from "@ai-ops/telemetry-contracts";

function generateSessionId(): string {
  try { return crypto.randomUUID(); } catch { return Math.random().toString(36).slice(2, 10); }
}

export function initTelemetry(
  rawConfig: Partial<TelemetryConfig> & Pick<TelemetryConfig, "appId" | "endpoint" | "writeKey">,
) {
  const config = resolveConfig(rawConfig);
  if (config.disabled) return createNoopTelemetry();

  const buffer = new EventBuffer(config);
  const transport = new FetchTransport(config);
  let sessionId = generateSessionId();
  const sessionTimer = setInterval(() => { sessionId = generateSessionId(); }, 30 * 60 * 1000);

  const createBatch = (events: TelemetryEventV1[]): TelemetryBatchV1 => ({
    schema_version: "1.0.0",
    sdk: { name: "@ai-ops/web-telemetry-sdk", version: "0.1.0" },
    sent_at: new Date().toISOString(),
    events,
  });

  const flushNormal = async (): Promise<void> => {
    const snapshot = buffer.drain();
    if (snapshot.events.length === 0) return;
    await transport.send(createBatch(snapshot.events));
  };

  const flushUnload = (): void => {
    const snapshot = buffer.drain();
    if (snapshot.events.length === 0) return;
    transport.sendUnload(createBatch(snapshot.events));
  };

  const onEvent = (event: TelemetryEventV1): void => {
    buffer.push(event);
    if (buffer.shouldFlush) void flushNormal();
  };

  const getRoute = () => {
    try { return config.routeResolver(window.location.href); } catch { return "/"; }
  };
  const getPageUrl = () => {
    try { return sanitizeUrl(window.location.href); } catch { return "/"; }
  };

  const collectorCtx: CollectorContext = {
    appId: config.appId,
    environment: config.environment,
    release: config.release,
    sdkVersion: "0.1.0",
    disabled: config.disabled,
    routeResolver: config.routeResolver,
    getSessionId: () => sessionId,
  };

  const errorCtx: ErrorCollectorContext = {
    onEvent,
    appId: config.appId,
    environment: config.environment,
    release: config.release,
    sdkVersion: "0.1.0",
    getSessionId: () => sessionId,
    getRoute,
    getPageUrl,
  };

  const logCtx: LogCollectorContext = {
    onEvent,
    appId: config.appId,
    environment: config.environment,
    release: config.release,
    sdkVersion: "0.1.0",
    getSessionId: () => sessionId,
    getRoute,
    getPageUrl,
  };

  const vitalsCollector = new VitalsCollector(collectorCtx, onEvent);
  const pageViewCollector = new PageViewCollector(collectorCtx, onEvent);
  const errorCollector = new ErrorCollector(errorCtx);
  const logCollector = new LogCollector(logCtx);
  const scheduler = new FlushScheduler(config, (reason) => {
    if (reason === "unload") flushUnload();
    else void flushNormal();
  });

  vitalsCollector.start();
  pageViewCollector.start();
  errorCollector.start();
  scheduler.start();

  return {
    log: (level: LogLevel, message: string, attributes?: Record<string, unknown>) => {
      if (!config.disabled) logCollector.log(level, message, attributes);
    },
    flush: flushNormal,
    shutdown: async () => {
      vitalsCollector.stop();
      pageViewCollector.stop();
      errorCollector.stop();
      scheduler.stop();
      clearInterval(sessionTimer);
      await flushNormal();
      transport.close();
    },
  };
}

function createNoopTelemetry() {
  return {
    log: () => {},
    flush: async () => {},
    shutdown: async () => {},
  };
}

export type TelemetryInstance = ReturnType<typeof initTelemetry>;
