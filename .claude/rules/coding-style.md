---
description: TypeScript/Node.js Monorepo 编码规范，涵盖命名、模块组织、类型使用与错误处理
globs: apps/**, packages/**
---

# 编码风格

> 项目尚无代码和 lint 配置，以下规范基于 TypeScript 社区惯例与项目架构约束制定。引入 ESLint/Prettier 后以具体配置为准。

## 命名

- **文件与目录**: 使用 kebab-case。`apps/telemetry-api/src/ingest/rate-limiter.ts`
- **TypeScript 类型/接口**: PascalCase。`type IncidentState = ...`、`interface SignalEnvelope { ... }`
- **变量与函数**: camelCase。`const activeIncidents = ...`、`function buildFingerprint(alert: Alert): string`
- **常量（模块级）**: UPPER_SNAKE_CASE。`export const MAX_MCP_CALLS_PER_DIAGNOSIS = 20`
- **React 组件**: PascalCase，文件名与组件名一致。`IncidentTimeline.tsx` → `export function IncidentTimeline()`
- **数据库表**: snake_case 复数。`incidents`、`diagnosis_hypotheses`
- **数据库列**: snake_case。`created_at`、`incident_id`
- **API 路由**: kebab-case 名词。`/api/v1/incidents/:id/evidence`
- **MCP 工具名**: snake_case 动词_名词。`query_prometheus_metrics`、`get_kubernetes_pod_logs`

## 模块组织

- 每个 `apps/*` 和 `packages/*` 是独立包，拥有自己的 `package.json` 和 `tsconfig.json`
- 共享类型和 Schema 放在 `packages/shared-schemas/`，禁止各 app 重复定义核心领域类型
- 每个包的 `src/` 内部按功能分层:
  - `domain/` — 纯领域类型和函数，不依赖 I/O
  - `api/` 或 `routes/` — HTTP 处理器
  - `service/` — 业务逻辑
  - `adapter/` — 外部系统适配器（数据库、Prometheus、通知渠道等）
  - `tools/` — MCP 工具定义（仅 mcp-server）
  - `workflows/` — Mastra Workflow 定义（仅 agent-runtime）

## TypeScript

- 所有包使用严格模式 (`strict: true`)
- 优先使用 `interface` 定义对象类型，`type` 用于联合、交叉和映射类型
- 禁止 `any`，未知类型使用 `unknown` 并在边界处校验（Zod Schema）
- 对外 API 契约（请求/响应/MCP 参数与返回值）必须定义 Zod Schema 并从其推导 TypeScript 类型
- 异步函数显式标注返回 `Promise<T>`
- 使用 `Result<T, E>` 或 discriminated union 表达可预期的失败分支，不依赖 try-catch 控制流程

## 格式

- 缩进: 2 空格
- 行尾: LF
- 字符串: 单引号，模板字符串使用反引号
- 分号: 必须（ASI 风险不依赖）
- 行宽: 100 字符建议上限

## 注释

- 公开 API、MCP 工具、Workflow 步骤和数据库迁移必须包含 JSDoc 或内联说明
- 业务规则（如去重算法、关联规则、超时逻辑）需注释"为什么"，而非复述代码
- TODO/FIXME/HACK 标记必须附带日期和负责人，并链接到 Issue 或 Spec

## 错误处理

- 服务边界层（API handler、MCP tool handler）统一捕获异常并映射为稳定错误码
- 内部错误码使用 UPPER_SNAKE_CASE 枚举，不在日志或响应中泄露堆栈、密钥或数据库信息
- 第三方调用必须设置超时并处理超时、连接拒绝、协议错误和限流
- Agent/Workflow 层区分可恢复错误（重试）和不可恢复错误（失败退出）
