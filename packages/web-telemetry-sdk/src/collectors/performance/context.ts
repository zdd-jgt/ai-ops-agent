/**
 * Shared context and helper utilities for performance collectors.
 *
 * Provides:
 * - {@link CollectorContext}: injects SDK config and dynamic session/page accessors
 * - {@link buildCommonFields}: builds the common envelope fields shared by all events
 * - {@link getNavigationType}: extracts navigation type from PerformanceNavigationTiming
 * - {@link checkCapabilityStatus}: snapshots which browser APIs are available
 */

import type { CapabilityStatus } from "@ai-ops/telemetry-contracts";

/**
 * Context injected into every performance collector by the SDK runtime.
 *
 * Collectors are stateless with respect to SDK config — all mutable state
 * (session, page URL) is fetched through accessors at event-creation time.
 */
export interface CollectorContext {
  /** Application identifier from SDK config. */
  appId: string;

  /** Environment label (e.g. "production", "staging"). */
  environment: string;

  /** Release version string. */
  release: string;

  /** SDK version string. */
  sdkVersion: string;

  /** When true the collector must short-circuit and produce no events. */
  disabled: boolean;

  /**
   * Route resolver provided by the host application.
   * Receives the current `window.location.href` and returns a standardized
   * route template (no query string, no hash fragment).
   */
  routeResolver: (url: string) => string;

  /** Returns the current anonymous session ID (rotated periodically). */
  getSessionId: () => string;
}

/**
 * Build the standard common envelope fields shared by every
 * {@link import("@ai-ops/telemetry-contracts").TelemetryEventV1}.
 *
 * Fields that vary per-event (event_id, timestamp) are generated here.
 * `page_url` and `route` are derived from `window.location` at call time.
 */
export function buildCommonFields(
  ctx: CollectorContext,
): Record<string, unknown> {
  const href = typeof window !== "undefined" ? window.location.href : "/";
  const url = new URL(href);
  const pageUrl = `${url.origin}${url.pathname}`;
  const route = ctx.routeResolver(href);

  return {
    schema_version: "1.0.0",
    event_id: generateUUID(),
    app_id: ctx.appId,
    environment: ctx.environment,
    release: ctx.release,
    route,
    session_id: ctx.getSessionId(),
    page_url: pageUrl,
    sdk_version: ctx.sdkVersion,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Check which browser performance and transport APIs are available.
 *
 * Returns a {@link CapabilityStatus} snapshot without side effects.
 * Can be called before `start()` to decide whether to enable the vitals collector.
 */
export function checkCapabilityStatus(): CapabilityStatus {
  const hasPO = typeof PerformanceObserver !== "undefined";
  const hasBeacon =
    typeof navigator !== "undefined" &&
    typeof navigator.sendBeacon === "function";

  return {
    performanceObserver: hasPO,
    sendBeacon: hasBeacon,
    lcp: hasPO,
    inp: hasPO,
    cls: hasPO,
    fcp: hasPO,
    ttfb: true, // TTFB can fall back to Navigation Timing API when PO is absent
  };
}

/**
 * Normalize a raw navigation type string (from web-vitals or Performance
 * Navigation Timing API) into one of our schema's allowed values.
 *
 * Mapping rules:
 * - `back_forward` (underscore) is mapped to kebab-case `back-forward`
 * - `back-forward-cache` / `restore` are treated as `navigate`
 * - Unknown values produce `undefined` (omitted from the event)
 */
export function normalizeNavigationType(
  raw: string | undefined,
): "navigate" | "reload" | "back-forward" | "prerender" | undefined {
  switch (raw) {
    case "navigate":
    case "reload":
    case "prerender":
      return raw;
    case "back_forward":
    case "back-forward":
      return "back-forward";
    case "back-forward-cache":
    case "restore":
      // Semantically close to a new navigation
      return "navigate";
    default:
      return undefined;
  }
}

/**
 * Extract the navigation type from PerformanceNavigationTiming API.
 * Returns `undefined` when the API is unavailable.
 */
export function getNavigationType(): string | undefined {
  try {
    if (typeof performance === "undefined") return undefined;
    const entries = performance.getEntriesByType("navigation");
    if (entries.length > 0) {
      return (entries[0] as PerformanceNavigationTiming).type;
    }
  } catch {
    // Graceful degradation
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

let _uuidCounter = 0;

/**
 * Generate a UUID v4 string.
 *
 * Uses `crypto.randomUUID()` in modern browsers / secure contexts.
 * Falls back to Math.random-based generation for older environments.
 */
function generateUUID(): string {
  try {
    return crypto.randomUUID();
  } catch {
    _uuidCounter++;
    // RFC 4122 v4 UUID pattern
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
