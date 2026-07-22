/**
 * Performance Collectors — barrel export.
 *
 * Re-exports all performance-related collectors and shared types so that
 * the SDK runtime and consumers can import from a single entry point:
 *
 * ```ts
 * import { VitalsCollector, PageViewCollector, checkCapabilityStatus } from
 *   './collectors/performance/index.js';
 * ```
 */

export { VitalsCollector, checkCapabilityStatus } from "./vitals-collector.js";
export { PageViewCollector } from "./page-view-collector.js";
export {
  buildCommonFields,
  getNavigationType,
  normalizeNavigationType,
} from "./context.js";
export type { CollectorContext } from "./context.js";
