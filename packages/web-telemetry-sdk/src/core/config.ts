/** SDK configuration. Minimal initialization requires appId, endpoint, and writeKey. */
export interface TelemetryConfig {
  appId: string;
  endpoint: string;
  /** Public ingestion identifier used for routing and quota, not a secret. */
  writeKey: string;
  environment: string;
  release: string;
  routeResolver: (url: string) => string;
  sampleRate: number;
  batchMaxEvents: number;
  batchMaxBytes: number;
  flushIntervalMs: number;
  bufferMaxEvents: number;
  eventMaxBytes: number;
  maxRetries: number;
  retryBaseMs: number;
  retryMaxMs: number;
  circuitBreakerThreshold: number;
  circuitBreakerRecoveryMs: number;
  disabled: boolean;
}

export const DEFAULT_CONFIG: Omit<TelemetryConfig, "appId" | "endpoint" | "writeKey" | "routeResolver"> = {
  environment: "production",
  release: "0.0.0",
  sampleRate: 1,
  batchMaxEvents: 20,
  batchMaxBytes: 64 * 1024,
  flushIntervalMs: 5000,
  bufferMaxEvents: 200,
  eventMaxBytes: 32 * 1024,
  maxRetries: 3,
  retryBaseMs: 1000,
  retryMaxMs: 30000,
  circuitBreakerThreshold: 5,
  circuitBreakerRecoveryMs: 30000,
  disabled: false,
};

export function resolveConfig(
  partial: Partial<TelemetryConfig> & Pick<TelemetryConfig, "appId" | "endpoint" | "writeKey">,
): TelemetryConfig {
  return {
    ...DEFAULT_CONFIG,
    environment: DEFAULT_CONFIG.environment,
    release: DEFAULT_CONFIG.release,
    routeResolver: () => "/",
    ...partial,
  };
}
