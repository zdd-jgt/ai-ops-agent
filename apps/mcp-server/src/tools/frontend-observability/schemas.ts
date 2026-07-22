import { z } from "zod";

const TimeRangeSchema = z.object({
  start: z.string().datetime().describe("UTC ISO-8601 start time"),
  end: z.string().datetime().describe("UTC ISO-8601 end time"),
});

const AppScopeSchema = z.object({
  appId: z.string().min(1).max(128).describe("Application identifier"),
  environment: z.string().min(1).max(64).optional().describe("Environment filter"),
});

export const QueryPagePerformanceInput = z.object({
  ...AppScopeSchema.shape,
  ...TimeRangeSchema.shape,
  route: z.string().max(256).optional().describe("Optional route filter"),
});
export type QueryPagePerformanceInput = z.infer<typeof QueryPagePerformanceInput>;

export interface QueryPagePerformanceOutput {
  queryStatus: "complete" | "partial" | "timeout";
  actualFilters: { tenantId: string; start: string; end: string; appId: string; environment?: string; route?: string };
  sampleCount: number;
  p75: { lcp: number | null; inp: number | null; cls: number | null; fcp: number | null; ttfb: number | null };
  evidenceIds: string[];
  truncated: boolean;
}

export const ListSlowPagesInput = z.object({
  ...AppScopeSchema.shape,
  ...TimeRangeSchema.shape,
  limit: z.number().int().min(1).max(50).optional().default(10),
});
export type ListSlowPagesInput = z.infer<typeof ListSlowPagesInput>;

export interface SlowPage {
  route: string;
  samples: number;
  p75: { lcp: number | null; inp: number | null; cls: number | null };
  errorCount: number;
}

export interface ListSlowPagesOutput {
  queryStatus: "complete" | "partial" | "timeout";
  actualFilters: { tenantId: string; start: string; end: string; appId: string; environment?: string };
  pages: SlowPage[];
  evidenceIds: string[];
  truncated: boolean;
}

const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;
export const SearchFrontendLogsInput = z.object({
  ...AppScopeSchema.shape,
  ...TimeRangeSchema.shape,
  level: z.enum(LOG_LEVELS).optional(),
  messageContains: z.string().max(200).optional(),
  limit: z.number().int().min(1).max(100).optional().default(20),
  cursor: z.string().max(256).optional(),
});
export type SearchFrontendLogsInput = z.infer<typeof SearchFrontendLogsInput>;

export interface FrontendLogEntry {
  timestamp: string;
  level: string;
  route: string;
  message: string;
  evidenceId: string;
}

export interface SearchFrontendLogsOutput {
  queryStatus: "complete" | "partial" | "timeout";
  actualFilters: { tenantId: string; start: string; end: string; appId: string; environment?: string; level?: string; messageContains?: string };
  items: FrontendLogEntry[];
  nextCursor?: string;
  evidenceIds: string[];
  truncated: boolean;
}

export const GetFrontendLogEventInput = z.object({
  evidenceId: z.string().min(1).max(256),
  appId: z.string().min(1).max(128),
  environment: z.string().min(1).max(64).optional(),
});
export type GetFrontendLogEventInput = z.infer<typeof GetFrontendLogEventInput>;

export interface FrontendLogEventDetail {
  evidenceId: string;
  timestamp: string;
  eventType: string;
  level: string;
  route: string;
  message: string;
  attributes?: Record<string, string>;
  sanitizedFields?: string[];
}

export interface GetFrontendLogEventOutput {
  queryStatus: "complete" | "timeout";
  event: FrontendLogEventDetail | null;
  actualFilters: { tenantId: string; evidenceId: string; appId: string; environment?: string };
}
