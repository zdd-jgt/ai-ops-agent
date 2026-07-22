import { defineConfig, devices } from "@playwright/test";

const webPort = 5174;
const telemetryPort = 3100;
const agentPort = 3102;
const e2eToken = "e2e-console-token";
const authTokens = JSON.stringify([{ token: e2eToken, subject: "e2e-console", tenantId: "e2e-tenant", roles: ["viewer", "admin", "service"], allowedAppIds: ["e2e-app", "demo-app", "ai-ops-console"], allowedEnvironments: ["development", "staging", "production"] }]);
const writeKeys = JSON.stringify([{ key: "e2e_public", tenantId: "e2e-tenant", appId: "e2e-app", allowedEnvironments: ["production"], allowedOrigins: ["http://127.0.0.1:5174"], allowMissingOrigin: true }, { key: "pub_console", tenantId: "e2e-tenant", appId: "ai-ops-console", allowedEnvironments: ["development"], allowedOrigins: ["http://127.0.0.1:5174"], allowMissingOrigin: false }]);


export default defineConfig({
  testDir: "./e2e",
  outputDir: "../../test-results/playwright",
  timeout: 45_000,
  expect: { timeout: 12_000 },
  fullyParallel: false,
  reporter: [["list"], ["html", { outputFolder: "../../playwright-report", open: "never" }]],
  use: {
    baseURL: `http://127.0.0.1:${webPort}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    colorScheme: "dark",
    reducedMotion: "reduce",
  },
  projects: [
    { name: "desktop-chrome", use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 1440, height: 1000 } } },
    { name: "mobile-chrome", use: { ...devices["Pixel 7"], channel: "chrome" } },
  ],
  webServer: [
    {
      command: "pnpm --filter @ai-ops/telemetry-api start",
      url: `http://127.0.0.1:${telemetryPort}/health`,
      env: {
        PORT: String(telemetryPort),
        NODE_ENV: "development",
        AIOPS_AUTH_TOKENS_JSON: authTokens,
        TELEMETRY_WRITE_KEYS_JSON: writeKeys,
        AIOPS_CORS_ORIGINS: "http://127.0.0.1:5174",
      },
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: "pnpm --filter @ai-ops/agent-runtime start",
      url: `http://127.0.0.1:${agentPort}/healthz`,
      env: {
        AGENT_RUNTIME_PORT: String(agentPort),
        TELEMETRY_API_URL: `http://127.0.0.1:${telemetryPort}`,
        MCP_ALLOWED_APP_IDS: "e2e-app,demo-app",
        MCP_ALLOWED_ENVIRONMENTS: "development,staging,production",
        AIOPS_AUTH_TOKENS_JSON: authTokens,
        TELEMETRY_QUERY_TOKEN: e2eToken,
        MCP_TENANT_ID: "e2e-tenant",
        NODE_ENV: "development",
      },
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: `pnpm --filter @ai-ops/web dev --host 127.0.0.1 --port ${webPort}`,
      url: `http://127.0.0.1:${webPort}`,
      env: {
        VITE_TELEMETRY_PROXY_TARGET: `http://127.0.0.1:${telemetryPort}`,
        VITE_AGENT_PROXY_TARGET: `http://127.0.0.1:${agentPort}`,
        VITE_AIOPS_DEV_TOKEN: e2eToken,
      },
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
