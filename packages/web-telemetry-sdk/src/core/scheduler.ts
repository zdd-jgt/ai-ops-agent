import type { TelemetryConfig } from "./config.js";

/** Flush reason lets unload delivery use Beacon instead of ordinary fetch. */
export type FlushReason = "interval" | "visibility" | "unload";
export type FlushCallback = (reason: FlushReason) => void;

export class FlushScheduler {
  private timer: ReturnType<typeof setInterval> | null = null;
  private visibilityHandler: (() => void) | null = null;
  private unloadHandler: (() => void) | null = null;

  constructor(
    private config: TelemetryConfig,
    private onFlush: FlushCallback,
  ) {}

  start(): void {
    if (this.config.disabled) return;
    this.timer = setInterval(() => this.onFlush("interval"), this.config.flushIntervalMs);

    if (typeof document !== "undefined") {
      this.visibilityHandler = () => {
        if (document.visibilityState === "hidden") this.onFlush("visibility");
      };
      document.addEventListener("visibilitychange", this.visibilityHandler);
    }

    if (typeof window !== "undefined") {
      this.unloadHandler = () => this.onFlush("unload");
      window.addEventListener("beforeunload", this.unloadHandler);
      window.addEventListener("pagehide", this.unloadHandler);
    }
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.visibilityHandler && typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.visibilityHandler);
      this.visibilityHandler = null;
    }
    if (this.unloadHandler && typeof window !== "undefined") {
      window.removeEventListener("beforeunload", this.unloadHandler);
      window.removeEventListener("pagehide", this.unloadHandler);
      this.unloadHandler = null;
    }
  }
}
