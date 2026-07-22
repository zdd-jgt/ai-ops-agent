/**
 * Mastra 实例 — Workflow + Agent + MCP + Storage 统一配置。
 */
import { Mastra } from "@mastra/core/mastra";
import { LibSQLStore } from "@mastra/libsql";
import { diagnosisWorkflow } from "./workflows/diagnosis.js";
import { opsChatAgent } from "./agents/ops-chat.js";
import { getMCPClient } from "./mcp-client.js";

// — Storage —
const isTest = process.env["VITEST"] === "true";
const dbUrl = isTest
  ? ":memory:"
  : process.env["LIBSQL_URL"] ?? `file:${import.meta.dirname}/../../../runtime-data/mastra.db`;

const storage = new LibSQLStore({
  id: "mastra-storage",
  url: dbUrl,
});

// — Mastra 实例 —
export const mastra = new Mastra({
  workflows: { diagnosis: diagnosisWorkflow },
  agents: { opsChatAgent },
  storage,
});

// — MCP 工具代理 —
export async function getMCPServers() {
  const mcp = await getMCPClient();
  return await mcp.toMCPServerProxies();
}

export { diagnosisWorkflow, opsChatAgent };
