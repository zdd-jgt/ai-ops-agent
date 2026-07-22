/**
 * @ai-ops/web-telemetry-sdk
 *
 * 浏览器前端遥测 SDK 入口。
 *
 * 最小使用示例：
 * ```ts
 * import { initTelemetry } from '@ai-ops/web-telemetry-sdk';
 *
 * const telemetry = initTelemetry({
 *   appId: 'my-web-app',
 *   endpoint: 'https://telemetry.example.com/v1/telemetry/batches',
 *   writeKey: 'pub_xxx',
 *   routeResolver: (url) => new URL(url).pathname,
 * });
 *
 * telemetry.log('info', 'page rendered', { module: 'dashboard' });
 * telemetry.flush();
 * telemetry.shutdown();
 * ```
 */

export { initTelemetry } from "./telemetry.js";
export type { TelemetryInstance } from "./telemetry.js";

export type { TelemetryConfig } from "./core/config.js";
export { resolveConfig, DEFAULT_CONFIG } from "./core/config.js";
export { EventBuffer } from "./core/buffer.js";
export type { BufferSnapshot } from "./core/buffer.js";
export { shouldSample } from "./core/sampling.js";
export { FlushScheduler } from "./core/scheduler.js";

export type { Transport } from "./transport/types.js";
export { FetchTransport } from "./transport/fetch-transport.js";
export { MockTransport } from "./transport/mock-transport.js";

// 脱敏
export {
  sanitizeUrl,
  sanitizeError,
  sanitizeStack,
  sanitizeAttributes,
  FORBIDDEN_PATTERNS,
  MAX_MESSAGE_LENGTH,
  MAX_STACK_LENGTH,
  MAX_FILENAME_LENGTH,
  MAX_ATTRIBUTE_KEY_LENGTH,
  MAX_ATTRIBUTE_VALUE_LENGTH,
  MAX_ATTRIBUTES_COUNT,
} from "./sanitize/index.js";

// 错误采集
export { ErrorCollector } from "./collectors/errors/index.js";
export type { ErrorCollectorContext } from "./collectors/errors/index.js";

// 显式日志采集
export { LogCollector } from "./collectors/logs/index.js";
export type { LogLevel, LogCollectorContext } from "./collectors/logs/index.js";

// 性能采集
export { VitalsCollector, PageViewCollector, checkCapabilityStatus } from "./collectors/performance/index.js";
export type { CollectorContext } from "./collectors/performance/index.js";
