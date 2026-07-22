import { expect, test, type APIRequestContext } from "@playwright/test";

const APP_ID = "e2e-app";
const ENVIRONMENT = "production";
const RELEASE = `e2e-${crypto.randomUUID().slice(0, 8)}`;
const ROUTE = "/checkout";

test.beforeEach(async ({ request }) => {
  await seedTelemetry(request);
});

test("real telemetry flows through dashboard, Evidence and Agent MCP", async ({ page }) => {
  await page.goto(`/?appId=${APP_ID}&environment=${ENVIRONMENT}&release=${RELEASE}&route=${encodeURIComponent(ROUTE)}&timeRange=1h`);

  await expect(page.getByRole("heading", { name: "智能运维大脑" })).toBeVisible();
  await expect(page.getByText("Agent 在线")).toBeVisible();
  await expect(page.getByText("3,200 ms").first()).toBeVisible();
  await expect(page.getByText(ROUTE, { exact: true })).toBeVisible();
  await expect(page).toHaveScreenshot("aiops-cockpit.png", {
    fullPage: true,
    animations: "disabled",
    mask: [page.locator(".aiops-filter-card input")],
  });

  await page.getByRole("button", { name: "错误与日志" }).click();
  await expect(page.getByText("checkout request failed").first()).toBeVisible();
  await page.getByRole("button", { name: /日志条目: checkout request failed/ }).click();
  const evidenceDialog = page.getByRole("dialog", { name: "Evidence 详情" });
  await expect(evidenceDialog).toBeVisible();
  await expect(evidenceDialog.getByText("checkout request failed", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "关闭" }).click();

  const agentInput = page.getByPlaceholder("例如：首页 LCP 为什么偏高？");
  await agentInput.fill("结算页最近有什么异常？");
  await page.getByRole("button", { name: "发送" }).click();
  await expect(page.getByText(/候选结论：LCP p75 为 3200ms/)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Evidence ·/)).toBeVisible();
});

test("query failures stay visible and do not fabricate health conclusions", async ({ page }) => {
  await page.route("**/api/v1/query/performance/**", async (route) => {
    await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "fixture unavailable" }) });
  });
  await page.goto(`/?appId=${APP_ID}&environment=${ENVIRONMENT}&release=${RELEASE}`);
  await expect(page.getByText(/查询失败/).first()).toBeVisible();
  await expect(page.getByText("待计算")).toBeVisible();
  await expect(page.getByText(/98\.5%/)).toHaveCount(0);
});

async function seedTelemetry(request: APIRequestContext) {
  const now = new Date().toISOString();
  const common = {
    schema_version: "1.0.0", app_id: APP_ID, environment: ENVIRONMENT, release: RELEASE,
    route: ROUTE, session_id: `session-${crypto.randomUUID()}`, page_url: `https://example.test${ROUTE}`,
    sdk_version: "0.1.0", timestamp: now,
  };
  const events = Array.from({ length: 10 }, (_, index) => ({
    ...common, event_id: crypto.randomUUID(), event_type: "web_vital", vital_type: "LCP",
    value: 3200, rating: "needs-improvement", delta: index,
  }));
  events.push({
    ...common, event_id: crypto.randomUUID(), event_type: "frontend_error", error_type: "js_error",
    message: "checkout request failed", stack: "Error: checkout request failed",
  } as never);
  events.push({
    ...common, event_id: crypto.randomUUID(), event_type: "frontend_log", level: "warn",
    message: "payment retry scheduled", attributes: { attempt: 2 },
  } as never);

  const response = await request.post(`http://127.0.0.1:3100/v1/telemetry/batches?writeKey=e2e_public`, {
    data: { schema_version: "1.0.0", sdk: { name: "playwright", version: "0.1.0" }, sent_at: now, events },
  });
  expect(response.ok()).toBeTruthy();
}
