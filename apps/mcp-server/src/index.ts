import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { setScope } from "./policy/index.js";
import {
  GetFrontendLogEventInput,
  ListSlowPagesInput,
  QueryPagePerformanceInput,
  SearchFrontendLogsInput,
  createFrontendObservabilityAdapter,
} from "./tools/frontend-observability/index.js";

const appIds = (process.env["MCP_ALLOWED_APP_IDS"] ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const environments = (process.env["MCP_ALLOWED_ENVIRONMENTS"] ?? "development,staging,production")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

setScope({
  tenantId: process.env["MCP_TENANT_ID"] ?? "",
  appIds,
  environments,
  maxTimeRangeMs: Number(process.env["MCP_MAX_TIME_RANGE_MS"] ?? 3_600_000),
  maxCallsPerRound: Number(process.env["MCP_MAX_CALLS_PER_ROUND"] ?? 4),
});

const adapter = createFrontendObservabilityAdapter();
const server = new McpServer({ name: "ai-ops-frontend-observability", version: "0.1.0" });
const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

function result(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value) }],
  };
}

server.registerTool(
  "query_page_performance",
  {
    description: "Query real Web Vitals aggregates for an authorized app and time range.",
    inputSchema: QueryPagePerformanceInput,
    annotations,
  },
  async (input) => result(await adapter.queryPagePerformance(input)),
);

server.registerTool(
  "list_slow_pages",
  {
    description: "List slow routes using real telemetry evidence.",
    inputSchema: ListSlowPagesInput,
    annotations,
  },
  async (input) => result(await adapter.listSlowPages(input)),
);

server.registerTool(
  "search_frontend_logs",
  {
    description: "Search sanitized frontend logs with bounded filters.",
    inputSchema: SearchFrontendLogsInput,
    annotations,
  },
  async (input) => result(await adapter.searchFrontendLogs(input)),
);

server.registerTool(
  "get_frontend_log_event",
  {
    description: "Resolve one evidence ID inside the authorized application scope.",
    inputSchema: GetFrontendLogEventInput,
    annotations,
  },
  async (input) => result(await adapter.getFrontendLogEvent(input)),
);

const transport = new StdioServerTransport();
await server.connect(transport);
