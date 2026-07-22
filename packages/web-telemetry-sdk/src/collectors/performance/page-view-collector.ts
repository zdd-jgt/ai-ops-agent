import type { TelemetryEventV1 } from "@ai-ops/telemetry-contracts";
import {
  buildCommonFields,
  getNavigationType,
  normalizeNavigationType,
  type CollectorContext,
} from "./context.js";

/** Collects full-page loads and browser-history SPA navigation events. */
export class PageViewCollector {
  private started = false;
  private currentRoute = "/";
  private boundLoadHandler: (() => void) | null = null;
  private boundPopStateHandler: (() => void) | null = null;
  private boundHashChangeHandler: (() => void) | null = null;
  private originalPushState: History["pushState"] | null = null;
  private originalReplaceState: History["replaceState"] | null = null;

  constructor(
    private ctx: CollectorContext,
    private onEvent: (event: TelemetryEventV1) => void,
  ) {
    if (typeof window !== "undefined") {
      this.currentRoute = ctx.routeResolver(window.location.href);
    }
  }

  start(): void {
    if (this.started || this.ctx.disabled) return;
    this.started = true;
    if (typeof window === "undefined" || typeof document === "undefined") return;

    if (document.readyState === "complete") {
      this.captureInitialLoad();
    } else {
      this.boundLoadHandler = () => this.captureInitialLoad();
      window.addEventListener("load", this.boundLoadHandler);
    }

    this.boundPopStateHandler = () => this.handleRouteChange();
    this.boundHashChangeHandler = () => this.handleRouteChange();
    window.addEventListener("popstate", this.boundPopStateHandler);
    window.addEventListener("hashchange", this.boundHashChangeHandler);
    this.installHistoryListeners();
  }

  stop(): void {
    if (typeof window === "undefined") return;
    if (this.boundLoadHandler) {
      window.removeEventListener("load", this.boundLoadHandler);
      this.boundLoadHandler = null;
    }
    if (this.boundPopStateHandler) {
      window.removeEventListener("popstate", this.boundPopStateHandler);
      this.boundPopStateHandler = null;
    }
    if (this.boundHashChangeHandler) {
      window.removeEventListener("hashchange", this.boundHashChangeHandler);
      this.boundHashChangeHandler = null;
    }
    if (this.originalPushState) {
      window.history.pushState = this.originalPushState;
      this.originalPushState = null;
    }
    if (this.originalReplaceState) {
      window.history.replaceState = this.originalReplaceState;
      this.originalReplaceState = null;
    }
    this.started = false;
  }

  private installHistoryListeners(): void {
    this.originalPushState = window.history.pushState;
    this.originalReplaceState = window.history.replaceState;
    const collector = this;
    window.history.pushState = function (...args) {
      collector.originalPushState!.apply(this, args);
      collector.handleRouteChange();
    };
    window.history.replaceState = function (...args) {
      collector.originalReplaceState!.apply(this, args);
      collector.handleRouteChange();
    };
  }

  private captureInitialLoad(): void {
    const loadDurationMs = this.calculateLoadDuration();
    const navigationType = normalizeNavigationType(getNavigationType());
    const event: TelemetryEventV1 = {
      ...buildCommonFields(this.ctx),
      event_type: "page_view",
      view_type: "initial_load",
      ...(navigationType ? { navigation_type: navigationType } : {}),
      ...(loadDurationMs !== undefined ? { load_duration_ms: loadDurationMs } : {}),
    } as unknown as TelemetryEventV1;
    this.onEvent(event);
  }

  private handleRouteChange(): void {
    const newRoute = this.ctx.routeResolver(window.location.href);
    if (newRoute === this.currentRoute) return;
    const previousRoute = this.currentRoute;
    this.currentRoute = newRoute;
    const event: TelemetryEventV1 = {
      ...buildCommonFields(this.ctx),
      event_type: "page_view",
      view_type: "route_change",
      previous_route: previousRoute,
    } as unknown as TelemetryEventV1;
    this.onEvent(event);
  }

  private calculateLoadDuration(): number | undefined {
    try {
      if (typeof performance === "undefined") return undefined;
      const entries = performance.getEntriesByType("navigation");
      if (entries.length === 0) return undefined;
      const nav = entries[0] as PerformanceNavigationTiming;
      if (nav.loadEventEnd > 0) return Math.round(nav.loadEventEnd - nav.startTime);
      if (nav.domContentLoadedEventEnd > 0) {
        return Math.round(nav.domContentLoadedEventEnd - nav.startTime);
      }
    } catch {
      // Unsupported browser APIs are a normal capability fallback.
    }
    return undefined;
  }
}
