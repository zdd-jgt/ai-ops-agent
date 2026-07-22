import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { AuthError } from "@ai-ops/auth-contracts";
import { executeDiagnosis } from "./workflows/frontend-diagnosis/workflow.js";
import type { DiagnosisInput } from "./workflows/frontend-diagnosis/types.js";
import { authenticateDiagnosisRequest } from "./auth.js";

const port = Number(process.env["AGENT_RUNTIME_PORT"] ?? 3002);

const server = createServer(async (request, response) => {
  setCors(response);
  if (request.method === "OPTIONS") {
    response.writeHead(204).end();
    return;
  }
  if (request.method === "GET" && request.url === "/healthz") {
    json(response, 200, { status: "ok", service: "agent-runtime" });
    return;
  }
  if (request.method === "POST" && request.url === "/v1/diagnosis") {
    try {
      const input = validateInput(await readJson(request));
      const principal = authenticateDiagnosisRequest(
        request.headers.authorization,
        input.appId,
        input.environment,
      );
      const diagnosis = await executeDiagnosis({ ...input, tenantId: principal.tenantId });
      json(response, diagnosis.status === "failed" ? 503 : 200, diagnosis);
    } catch (error) {
      const status = error instanceof AuthError ? (error.code === "UNAUTHENTICATED" ? 401 : 403) : 400;
      json(response, status, { error: error instanceof Error ? error.message : String(error) });
    }
    return;
  }
  json(response, 404, { error: "Not found" });
});

server.listen(port, () => {
  process.stderr.write(`agent-runtime listening on http://localhost:${port}\n`);
});

function setCors(response: ServerResponse): void {
  response.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
}

function json(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.byteLength;
    if (size > 64 * 1024) throw new Error("Request body exceeds 64 KiB");
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function validateInput(value: unknown): Omit<DiagnosisInput, "tenantId"> {
  if (!value || typeof value !== "object") throw new Error("JSON object required");
  const input = value as Record<string, unknown>;
  if (typeof input["question"] !== "string") throw new Error("question is required");
  if (typeof input["appId"] !== "string" || !input["appId"].trim()) throw new Error("appId is required");
  if (typeof input["environment"] !== "string" || !input["environment"].trim()) throw new Error("environment is required");
  const timeRange = input["timeRange"];
  if (timeRange !== undefined) {
    if (!timeRange || typeof timeRange !== "object") throw new Error("timeRange must be an object");
    const range = timeRange as Record<string, unknown>;
    if (typeof range["start"] !== "string" || typeof range["end"] !== "string") {
      throw new Error("timeRange.start and timeRange.end are required");
    }
    return {
      question: input["question"],
      appId: input["appId"],
      environment: input["environment"],
      timeRange: { start: range["start"], end: range["end"] },
    };
  }
  return {
    question: input["question"],
    appId: input["appId"],
    environment: input["environment"],
  };
}
