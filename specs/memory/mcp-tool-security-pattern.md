---
title: MCP 工具安全模式 — Scope 服务端派生 + 预算控制 + 输入白名单
feature: ops-log-chat-feature
type: reusable
tags: [mcp, security, scope, budget, tool, agent, prompt-injection]
date: 2026-07-21
---

**问题/场景**：Agent 通过 MCP 工具访问运维数据，需要防止模型越权、超预算、超范围和提示注入绕过。

**解法/结论**：
1. Scope 从服务端身份派生（`setScope(token)`），不信任模型传入的 appId/tenant
2. 每个工具调用前执行 `validateAppId()` + `validateTimeRange()` 双重校验
3. `BudgetTracker` 限制单轮最多 N 次 MCP 调用，消耗完抛 `BudgetExhaustedError`
4. 工具输入 Schema 只接受枚举、受控字符串、UTC 时间和数值上限（Zod）
5. 工具输出裁剪到固定字段白名单，底层 Query ID 和 AWS 凭据不出现在 MCP 响应中
6. 系统提示与用户提示分离存储（`SYSTEM_PROMPT` + `buildUserPrompt()`），日志内容不可污染系统指令

**复用方式**：任何新增的 MCP 工具（K8s、Prometheus、数据库查询）复用相同的 Scope + Budget + Truncation 策略层，只需新增 Schema 和 Adapter。
