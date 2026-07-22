import { BudgetTracker } from "../../policy/budget.js";
import {
  getScope,
  validateAppId,
  validateEnvironment,
  validateTimeRange,
} from "../../policy/scope.js";
import type {
  QueryPagePerformanceInput,
  QueryPagePerformanceOutput,
  ListSlowPagesInput,
  ListSlowPagesOutput,
  SearchFrontendLogsInput,
  SearchFrontendLogsOutput,
  GetFrontendLogEventInput,
  GetFrontendLogEventOutput,
} from "./schemas.js";

const BASE = process.env["TELEMETRY_API_URL"] ?? "http://localhost:3000";

interface RawPerformance {
  queryStatus: "complete" | "partial" | "timeout";
  sampleCount: number;
  p75: QueryPagePerformanceOutput["p75"];
  evidenceIds?: string[];
}

interface RawPages {
  queryStatus: "complete" | "partial" | "timeout";
  pages: ListSlowPagesOutput["pages"];
  evidenceIds?: string[];
  truncated?: boolean;
}

interface RawLogs {
  queryStatus: "complete" | "partial" | "timeout";
  items: Array<Omit<SearchFrontendLogsOutput["items"][number], "level"> & { level?: string }>;
  nextCursor?: string;
}

interface RawEvidence {
  eventId: string;
  eventType?: string;
  message: string;
  level: string;
  route: string;
  timestamp: string;
  attributes?: Record<string, string>;
  sanitizedFields?: string[];
}

function queryToken(): string {
  const token = process.env["TELEMETRY_QUERY_TOKEN"]
    ?? (process.env["NODE_ENV"] === "test" ? "test-query-token" : undefined);
  if (!token) throw new Error("TELEMETRY_QUERY_TOKEN is required");
  return token;
}

async function get<T>(path: string, params: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${queryToken()}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Query API ${response.status}: ${body.slice(0, 200)}`);
  }
  return response.json() as Promise<T>;
}

function authorize(
  budget: BudgetTracker,
  input: { appId: string; environment?: string; start?: string; end?: string },
): void {
  budget.consume();
  validateAppId(input.appId);
  validateEnvironment(input.environment);
  if (input.start && input.end) validateTimeRange(input.start, input.end);
}

export function createFrontendObservabilityAdapter() {
  const budget = new BudgetTracker();

  return {
    async queryPagePerformance(input: QueryPagePerformanceInput): Promise<QueryPagePerformanceOutput> {
      authorize(budget, input);
      const data = await get<RawPerformance>("/v1/query/performance/overview", {
        start: input.start,
        end: input.end,
        appId: input.appId,
        environment: input.environment,
        route: input.route,
      });
      const evidenceIds = data.evidenceIds ?? [];
      return {
        queryStatus: data.queryStatus,
        actualFilters: { tenantId: getScope().tenantId, ...input },
        sampleCount: data.sampleCount,
        p75: data.p75,
        evidenceIds,
        truncated: evidenceIds.length < data.sampleCount,
      };
    },

    async listSlowPages(input: ListSlowPagesInput): Promise<ListSlowPagesOutput> {
      authorize(budget, input);
      const limit = Math.min(input.limit ?? 10, 50);
      const data = await get<RawPages>("/v1/query/performance/pages", {
        start: input.start,
        end: input.end,
        appId: input.appId,
        environment: input.environment,
        limit,
      });
      return {
        queryStatus: data.queryStatus,
        actualFilters: {
          start: input.start,
          end: input.end,
          tenantId: getScope().tenantId,
          appId: input.appId,
          ...(input.environment ? { environment: input.environment } : {}),
        },
        pages: data.pages,
        evidenceIds: data.evidenceIds ?? [],
        truncated: data.truncated ?? data.pages.length >= limit,
      };
    },

    async searchFrontendLogs(input: SearchFrontendLogsInput): Promise<SearchFrontendLogsOutput> {
      authorize(budget, input);
      const limit = Math.min(input.limit ?? 20, 100);
      const data = await get<RawLogs>("/v1/query/logs/search", {
        start: input.start,
        end: input.end,
        appId: input.appId,
        environment: input.environment,
        level: input.level,
        messageContains: input.messageContains,
        limit,
        cursor: input.cursor,
      });
      const items = data.items.map((item) => ({ ...item, level: item.level ?? "info" }));
      return {
        queryStatus: data.queryStatus,
        actualFilters: {
          start: input.start,
          end: input.end,
          tenantId: getScope().tenantId,
          appId: input.appId,
          ...(input.environment ? { environment: input.environment } : {}),
          ...(input.level ? { level: input.level } : {}),
          ...(input.messageContains ? { messageContains: input.messageContains } : {}),
        },
        items,
        ...(data.nextCursor ? { nextCursor: data.nextCursor } : {}),
        evidenceIds: items.map((item) => item.evidenceId),
        truncated: Boolean(data.nextCursor),
      };
    },

    async getFrontendLogEvent(input: GetFrontendLogEventInput): Promise<GetFrontendLogEventOutput> {
      authorize(budget, input);
      const data = await get<RawEvidence>("/v1/query/logs/evidence", {
        id: input.evidenceId,
        appId: input.appId,
        environment: input.environment,
      });
      return {
        queryStatus: "complete",
        event: {
          evidenceId: data.eventId,
          timestamp: data.timestamp,
          eventType: data.eventType ?? "unknown",
          level: data.level,
          route: data.route,
          message: data.message,
          ...(data.attributes ? { attributes: data.attributes } : {}),
          ...(data.sanitizedFields ? { sanitizedFields: data.sanitizedFields } : {}),
        },
        actualFilters: {
          evidenceId: input.evidenceId,
          appId: input.appId,
          tenantId: getScope().tenantId,
          ...(input.environment ? { environment: input.environment } : {}),
        },
      };
    },

    get remainingBudget(): number {
      return budget.remaining;
    },
  };
}

export type FrontendObservabilityAdapter = ReturnType<typeof createFrontendObservabilityAdapter>;
