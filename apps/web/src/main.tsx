import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./app/App.js";
import { initTelemetry } from "@ai-ops/web-telemetry-sdk";
import "./styles/aiops-cockpit.css";

const telemetry = initTelemetry({
  appId: "ai-ops-console",
  endpoint: "/api/v1/telemetry/batches",
  writeKey: "pub_console",
  environment: "development",
  release: "0.1.0",
  routeResolver: (url) => {
    try { return new URL(url).pathname; } catch { return "/"; }
  },
  sampleRate: 1,
  flushIntervalMs: 5000,
});

telemetry.log("info", "控制台页面已加载", {
  module: "console",
  userAgent: navigator.userAgent.slice(0, 100),
});

createRoot(document.getElementById("root")!).render(
  <StrictMode><BrowserRouter><App /></BrowserRouter></StrictMode>,
);
