/**
 * Query Templates — 固定查询模板，禁止任意查询文本。
 *
 * 所有查询通过结构化参数触发，编译为 Logs Insights 查询。
 * 当前为本地 Mock 实现，真实 AWS 部署时替换为 CloudWatch Logs Insights API 调用。
 */

export interface QueryParams {
  /** 服务端派生的租户 ID。 */
  tenantId: string;
  /** 时间范围开始（ISO-8601） */
  start: string;
  /** 时间范围结束（ISO-8601） */
  end: string;
  /** 应用 ID */
  appId: string;
  /** 最大返回条数（默认 100） */
  limit?: number;
}

export interface PageStatsParams extends QueryParams {
  route?: string;
}

export interface LogSearchParams extends QueryParams {
  level?: "debug" | "info" | "warn" | "error";
  messageContains?: string;
  cursor?: string;
}

// ---- Template Results ----

export interface PerformanceOverview {
  queryStatus: "complete";
  tenantId: string;
  timeRange: { start: string; end: string };
  sampleCount: number;
  p75: {
    lcp: number | null;
    inp: number | null;
    cls: number | null;
    fcp: number | null;
    ttfb: number | null;
  };
  /** Real event IDs that support the aggregate; never synthesized. */
  evidenceIds: string[];
  generatedAt: string;
}

export interface PageStat {
  route: string;
  samples: number;
  p75: {
    lcp: number | null;
    inp: number | null;
    cls: number | null;
    fcp: number | null;
    ttfb: number | null;
  };
  errorCount: number;
}

export interface PageStatsResult {
  queryStatus: "complete" | "partial" | "timeout";
  tenantId: string;
  timeRange: { start: string; end: string };
  pages: PageStat[];
  /** Real event IDs for events included in the returned routes. */
  evidenceIds: string[];
  truncated: boolean;
  generatedAt: string;
}

export interface LogEntry {
  timestamp: string;
  eventType: string;
  route: string;
  message: string;
  evidenceId: string;
}

export interface LogSearchResult {
  queryStatus: "complete" | "partial" | "timeout";
  tenantId: string;
  timeRange: { start: string; end: string };
  items: LogEntry[];
  nextCursor?: string;
  generatedAt: string;
}

/**
 * 生成 CloudWatch Logs Insights 查询语句。
 * 仅在服务端编译，从不接受客户端传入的 query string。
 */
export function compilePerformanceOverviewQuery(params: QueryParams): string {
  return [
    `fields @timestamp, event_type, vital_type, value, rating`,
    `| filter event_type = "web_vital"`,
    `| filter app_id = "${params.appId}"`,
    `| filter tenant_id = "${params.tenantId}"`,
    `| sort @timestamp desc`,
    `| limit ${params.limit ?? 100}`,
  ].join("\n");
}

export function compilePageStatsQuery(params: PageStatsParams): string {
  const routeFilter = params.route ? `| filter route = "${params.route}"` : "";
  return [
    `fields @timestamp, event_type, vital_type, value, route`,
    `| filter event_type = "web_vital"`,
    `| filter app_id = "${params.appId}"`,
    `| filter tenant_id = "${params.tenantId}"`,
    routeFilter,
    `| sort @timestamp desc`,
    `| limit ${params.limit ?? 100}`,
  ].filter(Boolean).join("\n");
}

export function compileLogSearchQuery(params: LogSearchParams): string {
  const levelFilter = params.level ? `| filter level = "${params.level}"` : "";
  const msgFilter = params.messageContains
    ? `| filter message like /${params.messageContains.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/`
    : "";
  return [
    `fields @timestamp, event_type, route, level, message, event_id`,
    `| filter event_type = "frontend_error" or event_type = "frontend_log"`,
    `| filter app_id = "${params.appId}"`,
    `| filter tenant_id = "${params.tenantId}"`,
    levelFilter,
    msgFilter,
    `| sort @timestamp desc`,
    `| limit ${params.limit ?? 100}`,
  ].filter(Boolean).join("\n");
}
