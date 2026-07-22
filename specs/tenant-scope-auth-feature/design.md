# Tenant Scope Authentication Feature Design

## 架构

```text
Browser/Service -- Bearer Token --> Authenticator --> AuthPrincipal
SDK -- Write Key + Origin --> WriteKeyRegistry --> IngestScope

AuthPrincipal/IngestScope
  -> tenantId + appId + environment authorization
  -> tenant-scoped Event Store / Evidence
  -> Agent Runtime context
  -> MCP server-derived Scope
```

第一期只有一个组织，但仍使用显式 `tenantId`。租户值来自服务端 Token/Write Key Registry，客户端参数只表示想访问的 app/environment，不是授权来源。

## 模块边界

- `packages/auth-contracts`：共享 Principal、Token Registry、Scope 校验和安全比较，不依赖 Hono/Mastra。
- `apps/telemetry-api/src/policy`：Write Key Registry、Ingest Scope、Hono 认证中间件。
- `packages/telemetry-contracts`：增加服务端持久化事件 `TenantScopedTelemetryEventV1`。
- `apps/telemetry-api/src/lib/store.ts`：所有写入与查询强制 tenantId。
- `apps/agent-runtime/src/server.ts`：Bearer 认证与服务端 Scope 校验。
- `apps/mcp-server/src/policy`：增加 tenantId；Adapter 使用独立 Query Token。

## 配置契约

- `AIOPS_AUTH_TOKENS_JSON`：服务端 Token Registry JSON 数组，记录 token、subject、tenantId、roles、allowedAppIds、allowedEnvironments。
- `TELEMETRY_WRITE_KEYS_JSON`：采集 Key Registry JSON 数组，记录 key、tenantId、appId、allowedEnvironments、allowedOrigins。
- `TELEMETRY_QUERY_TOKEN`：Agent/MCP 调 Query API 的独立服务 Token。
- `MCP_TENANT_ID`：MCP 固定租户 Scope，必须与 Query Token 身份一致。
- `VITE_AIOPS_DEV_TOKEN`：仅本地开发前端身份替身；生产构建不得将其当作正式认证。

测试环境允许通过构造函数或显式测试配置注入 Fixture；生产缺配置失败关闭。

## 数据契约

```ts
type TenantScopedTelemetryEventV1 = TelemetryEventV1 & {
  tenant_id: string;
  received_at: string;
  ingest_id: string;
};
```

客户端即使提交 `tenant_id`，入站 Schema 不采纳该值；服务端使用 Registry 中的 tenantId 创建新对象。

## API 认证与授权

- `/health` 保持匿名 liveness。
- `/v1/telemetry/batches` 使用 Write Key Registry，并检查 app/environment/Origin。
- `/v1/query/**` 要求 Bearer Token，校验 app/environment 属于 Principal Scope。
- `/model/status` 要求认证；`/model/switch` 额外要求 `admin`。
- Agent `/healthz` 匿名；`/v1/diagnosis` 要求 Bearer Token，并校验 app/environment。
- 认证失败 401，角色或 Scope 不足 403，跨租户 Evidence 使用 404 避免资源枚举。

## MCP 安全

MCP 工具输入不增加可由模型控制的 tenantId。MCP Server 从 `MCP_TENANT_ID` 读取固定租户，Adapter 使用 `TELEMETRY_QUERY_TOKEN` 调 Query API。Agent 创建 MCP 子进程时只传运行时必要变量、Telemetry URL、Query Token 和 MCP Scope，不透传模型 Provider Key。

## 失败与审计

- Registry JSON 无效或生产配置缺失：启动失败。
- 未知凭据：401，不输出凭据内容。
- Scope 不符：403，结构化日志只记录主体与 Scope 元数据。
- 认证逻辑不做静默开发降级；测试 Fixture 必须显式注入。

## 发布与迁移影响

- 现有本地调用、Web E2E 和 MCP 启动需要补显式测试/开发 Token 配置。
- 旧 `events.json` 没有 tenant_id，不自动迁移；正式迁移方案在引入真实持久化后制定。
- 本 Feature 只做本地代码和测试，不执行 AWS、OIDC 或密钥配置。
