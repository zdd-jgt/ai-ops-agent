import type {
  ListSlowPagesInput,
  ListSlowPagesOutput,
  QueryPagePerformanceInput,
  QueryPagePerformanceOutput,
  SearchFrontendLogsInput,
  SearchFrontendLogsOutput,
} from "@ai-ops/mcp-server/tools/frontend-observability";
import { createFrontendObservabilityAdapter } from "@ai-ops/mcp-server/tools/frontend-observability";
import { createMCPClient } from "../mastra/mcp-client.js";

export interface DiagnosisTools {
  queryPagePerformance(input: QueryPagePerformanceInput): Promise<QueryPagePerformanceOutput>;
  listSlowPages(input: ListSlowPagesInput): Promise<ListSlowPagesOutput>;
  searchFrontendLogs(input: SearchFrontendLogsInput): Promise<SearchFrontendLogsOutput>;
}

export interface DiagnosisToolSession {
  tools: DiagnosisTools;
  close(): Promise<void>;
}

export interface DiagnosisToolScope {
  tenantId: string;
  appId: string;
  environment: string;
}

export type DiagnosisToolSessionFactory = (scope: DiagnosisToolScope) => Promise<DiagnosisToolSession>;

function parseToolResult<T>(value: unknown): T {
  if (typeof value === "string") return JSON.parse(value) as T;
  if (value && typeof value === "object" && "content" in value) {
    const content = (value as { content?: Array<{ type?: string; text?: string }> }).content;
    const text = content?.find((item) => item.type === "text")?.text;
    if (text) return JSON.parse(text) as T;
  }
  return value as T;
}

/** Actual Agent path: invoke the independently spawned MCP stdio server. */
export const createMcpDiagnosisToolSession: DiagnosisToolSessionFactory = async (scope) => {
  const client = createMCPClient(scope);
  const remoteTools = await client.listTools();

  async function invoke<T>(suffix: string, input: unknown): Promise<T> {
    const entry = Object.entries(remoteTools).find(([name]) => name.endsWith(`_${suffix}`));
    if (!entry?.[1].execute) throw new Error(`MCP tool unavailable: ${suffix}`);
    return parseToolResult<T>(await entry[1].execute(input, {} as never));
  }

  return {
    tools: {
      queryPagePerformance: (input) => invoke("query_page_performance", input),
      listSlowPages: (input) => invoke("list_slow_pages", input),
      searchFrontendLogs: (input) => invoke("search_frontend_logs", input),
    },
    close: () => client.disconnect(),
  };
};

/** In-process adapter for deterministic unit tests and Mastra workflow verification. */
export const createInProcessDiagnosisToolSession: DiagnosisToolSessionFactory = async () => {
  const adapter = createFrontendObservabilityAdapter();
  return {
    tools: adapter,
    close: async () => undefined,
  };
};
