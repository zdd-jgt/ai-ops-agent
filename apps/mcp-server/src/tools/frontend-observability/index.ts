export {
  QueryPagePerformanceInput,
  ListSlowPagesInput,
  SearchFrontendLogsInput,
  GetFrontendLogEventInput,
} from "./schemas.js";

export type {
  QueryPagePerformanceOutput,
  ListSlowPagesOutput,
  SearchFrontendLogsOutput,
  GetFrontendLogEventOutput,
  SlowPage,
  FrontendLogEntry,
  FrontendLogEventDetail,
} from "./schemas.js";

export {
  createFrontendObservabilityAdapter,
} from "./adapter.js";
export type { FrontendObservabilityAdapter } from "./adapter.js";

export const TOOL_NAMES = {
  QUERY_PAGE_PERFORMANCE: "query_page_performance",
  LIST_SLOW_PAGES: "list_slow_pages",
  SEARCH_FRONTEND_LOGS: "search_frontend_logs",
  GET_FRONTEND_LOG_EVENT: "get_frontend_log_event",
} as const;
