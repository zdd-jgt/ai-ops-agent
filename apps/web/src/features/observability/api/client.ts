/**
 * Query API Client — 调用 F-002 telemetry-api 的受控 Query API。
 *
 * 安全约束（强制）：
 * - 浏览器不保存 AWS 凭据
 * - 只调用服务端 Query API，不直接调 CloudWatch
 * - 所有查询参数结构化，不拼接 query string
 */

import type {
  PerformanceOverview,
  PageStatsResult,
  LogSearchResult,
  ErrorTrendResult,
  EvidenceDetail,
} from "./types.js";

const BASE = "/api"; // 生产环境通过 Nginx/ALB 代理到 telemetry-api
const DEV_TOKEN = import.meta.env["VITE_AIOPS_DEV_TOKEN"] as string | undefined;


interface FetchOptions {
  signal?: AbortSignal;
}

export interface QueryScopeOptions extends FetchOptions {
  environment?: string;
  release?: string;
  route?: string;
}

function scopeParams(options?: QueryScopeOptions): Record<string, string> {
  return {
    ...(options?.environment ? { environment: options.environment } : {}),
    ...(options?.release ? { release: options.release } : {}),
    ...(options?.route ? { route: options.route } : {}),
  };
}

async function get<T>(path: string, params: Record<string, string>, opts?: FetchOptions): Promise<T> {
  const url = new URL(`${BASE}${path}`, window.location.origin);
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(DEV_TOKEN ? { Authorization: `Bearer ${DEV_TOKEN}` } : {}),
    },
    signal: opts?.signal,
  });
  if (res.status === 429) throw new RateLimitError();
  if (res.status === 403) throw new ForbiddenError();
  if (!res.ok) throw new QueryApiError(res.status, await res.text());
  return res.json();
}

// ---- Custom Errors ----

export class QueryApiError extends Error {
  constructor(public status: number, body: string) {
    super(`Query API ${status}: ${body}`);
    this.name = "QueryApiError";
  }
}

export class RateLimitError extends QueryApiError {
  constructor() { super(429, "Rate limited"); this.name = "RateLimitError"; }
}

export class ForbiddenError extends QueryApiError {
  constructor() { super(403, "Forbidden"); this.name = "ForbiddenError"; }
}

// ---- Query Functions ----

export function fetchPerformanceOverview(
  start: string, end: string, appId: string, options?: QueryScopeOptions,
): Promise<PerformanceOverview> {
  return get<PerformanceOverview>("/v1/query/performance/overview", {
    start, end, appId, ...scopeParams(options),
  }, { signal: options?.signal });
}

export function fetchPageStats(
  start: string, end: string, appId: string,
  options?: QueryScopeOptions & { limit?: number },
): Promise<PageStatsResult> {
  return get<PageStatsResult>("/v1/query/performance/pages", {
    start, end, appId, ...scopeParams(options),
    ...(options?.limit ? { limit: String(options.limit) } : {}),
  }, { signal: options?.signal });
}

export function fetchLogSearch(
  start: string, end: string, appId: string,
  opts?: QueryScopeOptions & { level?: string; messageContains?: string; cursor?: string; limit?: number },
): Promise<LogSearchResult> {
  return get<LogSearchResult>("/v1/query/logs/search", {
    start, end, appId, ...scopeParams(opts),
    ...(opts?.level ? { level: opts.level } : {}),
    ...(opts?.messageContains ? { messageContains: opts.messageContains } : {}),
    ...(opts?.cursor ? { cursor: opts.cursor } : {}),
    ...(opts?.limit ? { limit: String(opts.limit) } : {}),
  }, { signal: opts?.signal });
}

export function fetchErrorTrend(
  start: string, end: string, appId: string,
  opts?: QueryScopeOptions & { granularity?: string },
): Promise<ErrorTrendResult> {
  return get<ErrorTrendResult>("/v1/query/logs/error-trend", {
    start, end, appId, ...scopeParams(opts),
    ...(opts?.granularity ? { granularity: opts.granularity } : {}),
  }, { signal: opts?.signal });
}

export function fetchEvidenceDetail(
  evidenceId: string, appId: string, options?: QueryScopeOptions,
): Promise<EvidenceDetail> {
  return get<EvidenceDetail>("/v1/query/logs/evidence", {
    id: evidenceId, appId, ...scopeParams(options),
  }, { signal: options?.signal });
}
