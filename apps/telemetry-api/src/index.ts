// 加载项目根目录 .env
import { existsSync } from "node:fs";
const rootEnv = new URL("../../../.env", import.meta.url).pathname;
if (existsSync(rootEnv)) {
  process.loadEnvFile(rootEnv);
}

import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { AuthError } from "@ai-ops/auth-contracts";
import { createIngestRouter } from "./ingest/router.js";
import query from "./query/router.js";
import { healthRouter } from "./health.js";
import { modelRouter } from "./model-router.js";
import { structuredLog } from "./lib/response.js";
import { StdoutSink, LocalFileSink, CompositeSink } from "./sinks/index.js";
import { authStatus } from "./policy/auth.js";
import { createCorsOriginResolver } from "./policy/cors.js";

// ---- Sink Setup ----

const isProduction = process.env["NODE_ENV"] === "production";

const sink = isProduction
  ? new StdoutSink() // ECS → stdout → awslogs → CloudWatch
  : new CompositeSink([
      new StdoutSink(),
      new LocalFileSink("./runtime-data/telemetry"),
    ]);

structuredLog("info", "sink initialized", { mode: isProduction ? "stdout-only" : "stdout+local" });

// ---- App ----

const app = new Hono();

const resolveCorsOrigin = createCorsOriginResolver(process.env["AIOPS_CORS_ORIGINS"]);
// CORS — only explicitly configured console/SDK origins are reflected.
app.use(
  "*",
  cors({
    origin: resolveCorsOrigin,
    allowMethods: ["POST", "GET", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Telemetry-Write-Key"],
    maxAge: 86400,
  }),
);

// 请求日志
app.use("*", async (c, next) => {
  const start = Date.now();
  await next();
  structuredLog("info", "request", {
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    durationMs: Date.now() - start,
  });
});

// 全局兜底
app.onError((err, c) => {
  if ((err as Error) instanceof AuthError) {
    const authError = err as AuthError;
    const status = authStatus(authError);
    structuredLog("warn", "authorization rejected", { code: authError.code, status });
    return c.json({ error: authError.code, message: authError.message }, status);
  }
  structuredLog("error", "unhandled error", { name: err.name, message: err.message });
  return c.json({ error: "INTERNAL_ERROR", message: "An unexpected error occurred" }, 500);
});

// 路由
app.route("/", createIngestRouter(sink));
app.route("/", query);
app.route("/", healthRouter);
app.route("/", modelRouter);

// 直接运行时启动服务器（测试导入时跳过）
const isEntryPoint = process.argv[1]?.includes("telemetry-api");

if (isEntryPoint) {
  const port = Number(process.env["PORT"]) || 3000;
  serve({ fetch: app.fetch, port }, (info) => {
    structuredLog("info", "server started", { port: info.port });
  });
}

export { sink };
export default app;
