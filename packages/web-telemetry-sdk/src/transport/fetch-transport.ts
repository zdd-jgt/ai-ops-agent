import type { TelemetryBatchV1, IngestResponse } from "@ai-ops/telemetry-contracts";
import type { Transport } from "./types.js";
import type { TelemetryConfig } from "../core/config.js";

interface TransportState {
  consecutiveFailures: number;
  circuitOpen: boolean;
  circuitOpenedAt: number;
}

interface RetryWaiter {
  timer: ReturnType<typeof setTimeout>;
  resolve: (canRetry: boolean) => void;
}

/** Fetch transport with bounded retries, circuit breaking, and unload delivery. */
export class FetchTransport implements Transport {
  private state: TransportState = {
    consecutiveFailures: 0,
    circuitOpen: false,
    circuitOpenedAt: 0,
  };
  private retryWaiters = new Set<RetryWaiter>();
  private closed = false;

  constructor(private config: TelemetryConfig) {}

  async send(batch: TelemetryBatchV1): Promise<IngestResponse> {
    if (this.config.disabled || this.closed) {
      return this.failure(batch, "INTERNAL_ERROR", "transport closed or disabled");
    }
    return this.sendAttempt(batch, 0);
  }

  private async sendAttempt(batch: TelemetryBatchV1, attempt: number): Promise<IngestResponse> {
    if (this.state.circuitOpen) {
      if (Date.now() - this.state.circuitOpenedAt > this.config.circuitBreakerRecoveryMs) {
        this.state.circuitOpen = false;
        this.state.consecutiveFailures = 0;
      } else {
        return this.failure(batch, "INTERNAL_ERROR", "circuit breaker open");
      }
    }

    try {
      const response = await fetch(this.config.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Telemetry-Write-Key": this.config.writeKey,
        },
        body: JSON.stringify(batch),
        keepalive: true,
        signal: AbortSignal.timeout(15000),
      });

      if (response.status === 429) return this.retry(batch, "RATE_LIMITED", attempt);
      if (response.status >= 500) return this.retry(batch, "INTERNAL_ERROR", attempt);
      if (response.status === 401 || response.status === 403) {
        return this.failure(batch, "FORBIDDEN");
      }
      if (response.status === 413) return this.failure(batch, "BATCH_TOO_LARGE");
      if (response.status === 422) return this.failure(batch, "INVALID_SCHEMA");
      if (!response.ok) return this.failure(batch, "INVALID_SCHEMA");

      this.state.consecutiveFailures = 0;
      return await response.json() as IngestResponse;
    } catch {
      return this.retry(batch, "INTERNAL_ERROR", attempt);
    }
  }

  sendUnload(batch: TelemetryBatchV1): void {
    if (this.config.disabled || this.closed) return;
    const endpoint = new URL(this.config.endpoint, globalThis.location?.href ?? "http://localhost");
    endpoint.searchParams.set("writeKey", this.config.writeKey);
    const body = JSON.stringify(batch);
    const blob = new Blob([body], { type: "application/json" });

    try {
      const sent = typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function"
        ? navigator.sendBeacon(endpoint.toString(), blob)
        : false;
      if (!sent && typeof fetch === "function") {
        void fetch(this.config.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Telemetry-Write-Key": this.config.writeKey,
          },
          body,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // Unload delivery must never block or throw into the host page.
    }
  }

  close(): void {
    this.closed = true;
    for (const waiter of this.retryWaiters) {
      clearTimeout(waiter.timer);
      waiter.resolve(false);
    }
    this.retryWaiters.clear();
  }

  private async retry(
    batch: TelemetryBatchV1,
    status: "RATE_LIMITED" | "INTERNAL_ERROR",
    attempt: number,
  ): Promise<IngestResponse> {
    this.state.consecutiveFailures++;
    if (this.state.consecutiveFailures >= this.config.circuitBreakerThreshold) {
      this.state.circuitOpen = true;
      this.state.circuitOpenedAt = Date.now();
    }
    if (attempt >= this.config.maxRetries || this.state.circuitOpen) {
      return this.failure(batch, status, "retry limit reached");
    }

    const delay = Math.min(
      this.config.retryBaseMs * Math.pow(2, attempt),
      this.config.retryMaxMs,
    );
    const canRetry = await this.waitForRetry(delay);
    if (!canRetry) return this.failure(batch, status, "retry cancelled");
    return this.sendAttempt(batch, attempt + 1);
  }

  private waitForRetry(delay: number): Promise<boolean> {
    return new Promise((resolve) => {
      const waiter = {} as RetryWaiter;
      waiter.resolve = resolve;
      waiter.timer = setTimeout(() => {
        this.retryWaiters.delete(waiter);
        resolve(!this.closed);
      }, delay);
      this.retryWaiters.add(waiter);
    });
  }

  private failure(
    batch: TelemetryBatchV1,
    status: "RATE_LIMITED" | "INTERNAL_ERROR" | "FORBIDDEN" | "BATCH_TOO_LARGE" | "INVALID_SCHEMA",
    detail?: string,
  ): IngestResponse {
    return {
      accepted: 0,
      rejected: batch.events.length,
      results: batch.events.map((event, index) => ({
        index,
        event_id: event.event_id,
        status,
        ...(detail ? { detail } : {}),
      })),
    };
  }
}
