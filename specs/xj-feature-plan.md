# XJ Feature Execution Plan

## Summary

- Initiative：Frontend Observability MVP。
- Source PRD：`docs/phases/phase-1/mvp-prd.md`。
- Dependency order：F-001 → F-002 → F-003/F-004 → F-005。
- Review remediation date：2026-07-22。
- External operations：AWS 部署与付费模型调用未获批准，不执行。

## Feature Status

| ID | Feature | Current status | QA evidence | Remaining gate |
|---|---|---|---|---|
| F-001 | `frontend-telemetry-sdk-feature` | implemented, review fixes applied | SDK 15 tests + typecheck | 浏览器示例与体积门禁 |
| F-002 | `aws-telemetry-pipeline-feature` | local pipeline implemented | API 15 tests + typecheck | T-PIPE-006 AWS 实际部署 |
| F-003 | `performance-dashboard-feature` | implemented, scoped Evidence fixed | Web 22 tests + desktop/mobile Chrome E2E + 2 visual baselines | 自动化可访问性专项审计 |
| F-004 | `ops-log-chat-feature` | local Agent→MCP→Query path implemented | MCP 5 + Agent 8 tests；真实三服务 E2E | 真实模型评测 |
| F-005 | `tenant-scope-auth-feature` | pending | not run | 单组织认证、tenant Scope 与安全回归 |

这些状态不等于生产完成。没有真实 AWS、真实付费模型或 Air-Gapped 证据时，不得标记 4/4 production complete。

## Review Remediation

- SDK：真实有限重试；按数量/字节立即 flush；unload Beacon；SPA history 路由监听。
- Pipeline：去重结果保留原始索引；Beacon writeKey；environment 过滤；Evidence 按 app/environment 校验。
- MCP：补齐 `src/index.ts`；四工具注册；服务端 Scope、时间与调用预算；不再生成随机 Evidence ID。
- Agent/UI：移除固定 LCP 和“未发现异常”；Agent Runtime 提供 `/v1/diagnosis`；Chat 调用真实 API；零证据返回 `partial`。
- Tooling：MCP 测试不再为空；根 `lint` 使用 TypeScript 静态检查；Web 生产构建已验证。

## Verification Snapshot

```text
pnpm test                         PASS, 79 tests
pnpm --filter @ai-ops/web test:e2e PASS, 4 tests, desktop/mobile Chrome
pnpm typecheck                    PASS
pnpm lint                         PASS (TypeScript static check alias)
pnpm --filter @ai-ops/web build   PASS, chunk-size warning remains
Agent→MCP→Query smoke             PASS on temporary local ports
```

## Current Cursor

- Run ID：review-remediation-20260722。
- Active feature：`tenant-scope-auth-feature`。
- Active task：`T-AUTH-001`。
- Last completed：review remediation and local verification。
- Next action：按 QA-4 顺序实现 T-AUTH-001 至 T-AUTH-004；不处理 AWS 或付费模型。

## Global Gates

- Security：禁止字段泄漏、任意查询、跨 Scope、XSS 或 Prompt Injection 任一失败均阻塞。
- Payment/cost：ECS、ALB、CloudWatch、WAF、DNS、证书和付费模型调用前必须单独确认。
- Browser/visual：本地 macOS 系统 Chrome 桌面/移动视觉基线已复验；其他平台与自动化可访问性专项仍未覆盖。
- Deployment：`T-PIPE-006` 保持 `[!] blocked`，直到获得账户、区域、预算和回滚批准。

## Blockers

| Feature | Task | Reason | Required decision/evidence |
|---|---|---|---|
| F-002 | T-PIPE-006 | 真实 AWS 资源可能产生费用 | AWS 账户、区域、预算、域名与回滚批准 |
| F-004 | model QA | 真实模型可能产生费用 | 模型预算批准 |
