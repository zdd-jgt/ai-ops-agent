import { Hono } from "hono";

export const healthRouter = new Hono();

healthRouter.get("/health", (c) => {
  return c.json({
    status: "ok",
    service: "telemetry-api",
    version: "0.1.0",
    timestamp: new Date().toISOString(),
  });
});
