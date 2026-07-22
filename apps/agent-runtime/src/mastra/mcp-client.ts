import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { MCPClient } from "@mastra/mcp";

const REPO_ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const TSX_LOADER = resolve(REPO_ROOT, "apps/mcp-server/node_modules/tsx/dist/loader.mjs");

export interface McpRuntimeScope {
  tenantId: string;
  appId: string;
  environment: string;
}

const ALLOWED_CHILD_ENV = [
  "PATH",
  "TMPDIR",
  "NODE_ENV",
  "TELEMETRY_API_URL",
  "TELEMETRY_QUERY_TOKEN",
  "MCP_MAX_TIME_RANGE_MS",
  "MCP_MAX_CALLS_PER_ROUND",
] as const;

export function buildMcpChildEnvironment(
  scope: McpRuntimeScope,
  source: NodeJS.ProcessEnv = process.env,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of ALLOWED_CHILD_ENV) {
    const value = source[key];
    if (value) result[key] = value;
  }
  if (!result["TELEMETRY_QUERY_TOKEN"] && source["NODE_ENV"] === "test") {
    result["TELEMETRY_QUERY_TOKEN"] = "test-query-token";
  }
  if (!result["TELEMETRY_QUERY_TOKEN"]) {
    throw new Error("TELEMETRY_QUERY_TOKEN is required for MCP");
  }
  result["MCP_TENANT_ID"] = scope.tenantId;
  result["MCP_ALLOWED_APP_IDS"] = scope.appId;
  result["MCP_ALLOWED_ENVIRONMENTS"] = scope.environment;
  return result;
}

/** Create one stdio MCP connection. One process equals one bounded diagnosis round. */
export function createMCPClient(scope: McpRuntimeScope): MCPClient {
  return new MCPClient({
    id: `frontend-observability-${crypto.randomUUID()}`,
    servers: {
      frontendObservability: {
        command: process.execPath,
        args: [
          "--import",
          TSX_LOADER,
          resolve(REPO_ROOT, "apps/mcp-server/src/index.ts"),
        ],
        cwd: REPO_ROOT,
        env: buildMcpChildEnvironment(scope),
        stderr: "pipe",
      },
    },
    timeout: 30_000,
  });
}

let sharedClient: MCPClient | null = null;

/** Shared client is only for Mastra server proxy discovery. Diagnosis runs use isolated clients. */
export async function getMCPClient(): Promise<MCPClient> {
  const tenantId = process.env["MCP_TENANT_ID"] ?? "";
  const appId = (process.env["MCP_ALLOWED_APP_IDS"] ?? "").split(",").map((value) => value.trim()).find(Boolean) ?? "";
  const environment = (process.env["MCP_ALLOWED_ENVIRONMENTS"] ?? "").split(",").map((value) => value.trim()).find(Boolean) ?? "";
  if (!tenantId || !appId || !environment) {
    throw new Error("MCP tenant, app and environment scope must be configured");
  }
  sharedClient ??= createMCPClient({ tenantId, appId, environment });
  return sharedClient;
}

export async function disconnectMCP(): Promise<void> {
  if (!sharedClient) return;
  await sharedClient.disconnect();
  sharedClient = null;
}
