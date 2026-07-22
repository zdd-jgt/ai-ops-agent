/** Query API 返回类型（与 F-002 apps/telemetry-api/src/query/templates.ts 对齐） */

export interface PerformanceOverview {
  queryStatus: "complete" | "partial" | "timeout";
  timeRange: { start: string; end: string };
  sampleCount: number;
  p75: {
    lcp: number | null;
    inp: number | null;
    cls: number | null;
    fcp: number | null;
    ttfb: number | null;
  };
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
  timeRange: { start: string; end: string };
  pages: PageStat[];
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
  timeRange: { start: string; end: string };
  items: LogEntry[];
  nextCursor?: string;
  generatedAt: string;
}

/** 错误趋势数据点 */
export interface ErrorTrendPoint {
  /** 时间桶（ISO 8601） */
  timestamp: string;
  /** 该桶内错误请求数 */
  errorCount: number;
  /** 该桶内总请求数 */
  totalCount: number;
  /** 错误率（0–100） */
  errorRate: number;
}

export interface ErrorTrendResult {
  queryStatus: "complete" | "partial" | "timeout";
  timeRange: { start: string; end: string };
  /** 按时间升序排列的数据点 */
  points: ErrorTrendPoint[];
  generatedAt: string;
}

/** Evidence 详情（只包含允许渲染的白名单字段） */
export interface EvidenceDetail {
  eventId: string;
  message: string;
  level: string;
  route: string;
  timestamp: string;
  /** 可选扩展属性（键值对，纯文本） */
  attributes?: Record<string, string>;
  /** 已被服务端脱敏移除的字段名列表 */
  sanitizedFields?: string[];
}

export type QueryStatus = "idle" | "pending" | "complete" | "partial" | "timeout" | "error" | "forbidden";

export interface QueryState<T> {
  data: T | null;
  status: QueryStatus;
  error?: string;
}
