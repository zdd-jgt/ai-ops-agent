---
description: 后端 API 设计规范，涵盖路由、错误处理、中间件、遥测接入与 MCP 契约
globs: apps/telemetry-api/**, apps/mcp-server/**, apps/agent-runtime/**, packages/model-gateway/**, packages/event-center/**
---

# 后端 API 规范

> 基于 `docs/01-target-architecture.md`、`specs/aws-telemetry-pipeline-feature/design.md` 和 `specs/ops-log-chat-feature/design.md` 提取。

## API 设计原则

- RESTful 命名，资源用名词复数: `/api/v1/incidents`、`/api/v1/services`
- 版本化: `/api/v1/` 前缀，破坏性变更升级版本号
- 请求体使用 JSON，响应体统一信封:

```json
{
  "status": "ok",
  "data": { ... },
  "meta": { "query_status": "complete", "generated_at": "..." }
}
```

## 路由规范

- 遥测接入 (`apps/telemetry-api`):
  - `POST /api/v1/ingest` — 批次遥测写入
  - `POST /api/v1/query` — 结构化查询（编译为 Logs Insights 模板）
- 事件中心 (`packages/event-center`):
  - `GET /api/v1/incidents` — 事件列表
  - `GET /api/v1/incidents/:id` — 事件详情 + 时间线
  - `GET /api/v1/incidents/:id/evidence` — 证据列表
- Agent Runtime (`apps/agent-runtime`):
  - `POST /api/v1/diagnosis` — 发起诊断
  - `GET /api/v1/diagnosis/:id` — 诊断状态与结果
  - `POST /api/v1/diagnosis/:id/cancel` — 取消诊断

## 失败语义

- **4xx**: 全局错误 — 请求格式/鉴权/参数问题，不应重试
- **429**: 限流 — 返回 `Retry-After` Header
- **5xx**: 内部错误 — 不包含原始敏感载荷，记录内部错误码
- **批次部分失败**: 返回逐项状态，每个事件携带稳定错误码，不因部分失败拒绝整批
- **查询异步状态**: `pending | complete | partial | failed | timeout`
- 幂等性: 写入操作使用幂等键（如 `event_id`），重复投递不会创建重复资源

## 中间件

所有 API 服务必须包含以下中间件（按顺序）:

1. 请求 ID 注入（`X-Request-Id`）
2. 结构化日志（请求方法、路径、状态码、耗时）
3. 认证/鉴权（服务端身份校验，不信任客户端传入的租户/Scope）
4. 限流（按租户 + 环境 + API Key 多维度）
5. 参数校验（Zod Schema，拒绝未知字段）

## 遥测接入安全

- Origin 白名单 + 限流 + 配额 + Schema 校验 + 载荷上限，多层叠加
- 浏览器写入标识只用于路由和配额，不视为秘密
- 清洗后的日志只输出到 stdout（单行 JSON），由容器日志驱动收集
- Query API 不接收 raw query string，只接受结构化过滤器

## MCP 工具契约

- 输入只接受: 枚举值、受控字符串、UTC 时间范围、数值上限
- 返回必须包含: `query_status`、`actual_filters`、`time_range`、`items/aggregates`、`evidence_ids`、`truncated`
- 禁止返回: AWS 凭据、底层 Query ID 的敏感关联、未脱敏原始字段
- Scope 从服务端身份派生，不信任模型/客户端传入
- 单个工具默认超时 15 秒，结构化响应不超过 256KB

## 模型网关

- Provider 插件接口统一: `chat()`、`chatStream()`、`toolCall()`、`healthCheck()`
- 每个 Provider 配置: Base URL、API Key 引用（不内联值）、超时、重试策略
- 路由规则: 基于租户/环境/数据级别的模型选择，Air-Gapped 只路由到本地 Provider
- 审计记录: 模型名、延迟、Token 消耗、截断/降级标记
