# AI Ops Agent

一个面向前端可观测性的只读智能运维 MVP。浏览器 SDK 采集 Web Vitals、错误和日志，Telemetry API 完成校验、脱敏、去重与固定模板查询；Agent Runtime 通过独立的 MCP stdio 进程调用受控工具，并在 Web 页面展示诊断步骤与真实 Evidence。

## 当前状态

- 本地核心链路已实现，并完成针对 review 问题的修复。
- `pnpm test`：98 个测试通过。
- `pnpm typecheck`、`pnpm lint`：通过；当前 `lint` 是 TypeScript 静态检查别名，尚未接入 ESLint。
- Web 生产构建通过，但存在单个 chunk 大于 500 kB 的警告。
- Agent→MCP→Query API 端到端冒烟通过；零样本时返回 `partial`，不会伪造“无异常”。
- 本地 Chrome 桌面/移动 E2E 与视觉基线已完成；AWS、真实付费模型和 Air-Gapped 验证尚未完成，不能视为生产交付。

## 项目结构

```text
apps/
  telemetry-api/   Hono 接入与固定模板 Query API，默认端口 3000
  mcp-server/      4 个只读 MCP 工具及 Scope/Budget 策略
  agent-runtime/   诊断 Workflow 与 HTTP API，默认端口 3002
  web/             React 监控面板和运维聊天，默认端口 5173
packages/
  auth-contracts/       Principal、Bearer Registry 与服务端 Scope 契约
  telemetry-contracts/  共享 Zod 事件契约
  web-telemetry-sdk/    采集、脱敏、Buffer、重试和 Beacon
examples/sdk-demo/      SDK 接入示例
docs/                   架构、阶段和安全设计
specs/                  Feature requirements/design/tasks/test-cases
infra/aws/              仅准备的 AWS 配置，未部署
```

## 本地启动

要求 Node.js 22+、pnpm 10+。本机建议使用 Volta Node，避免系统 Node 版本过旧。

```bash
pnpm install
cp .env.example .env
```

至少确认以下配置：

```dotenv
TELEMETRY_API_URL=http://localhost:3000
TELEMETRY_QUERY_TOKEN=dev-mcp-token
AIOPS_AUTH_TOKENS_JSON=[...]
TELEMETRY_WRITE_KEYS_JSON=[...]
AIOPS_CORS_ORIGINS=http://localhost:5173
MCP_TENANT_ID=dev-tenant
MCP_ALLOWED_APP_IDS=demo-app
MCP_ALLOWED_ENVIRONMENTS=development,staging,production
AGENT_RUNTIME_PORT=3002
VITE_AIOPS_DEV_TOKEN=dev-console-token
```

分别启动三个终端：

```bash
pnpm --filter @ai-ops/telemetry-api dev
pnpm --filter @ai-ops/agent-runtime dev
pnpm --filter @ai-ops/web dev
```

打开 `http://localhost:5173`。Agent Runtime 会为每轮诊断自动启动短生命周期 MCP stdio 子进程，不需要单独启动 MCP HTTP 服务。

健康检查：

```bash
curl http://localhost:3000/health
curl http://localhost:3002/healthz
```

诊断请求示例：

```bash
curl -X POST http://localhost:3002/v1/diagnosis \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer dev-console-token' \
  -d '{
    "question":"首页最近有异常吗？",
    "appId":"demo-app",
    "environment":"production"
  }'
```

## 验证命令

```bash
pnpm test
pnpm test:e2e
pnpm typecheck
pnpm lint
pnpm --filter @ai-ops/web build
```

## 安全边界

- Phase 1 仅允许只读诊断工具，不提供任意 Shell、SQL、SSH、kubectl 或写操作。
- 第一阶段采用单组织、多应用、多环境；`tenantId` 由服务端 Bearer/Write Key Registry 派生，不能由浏览器或模型扩权。
- MCP Server 从服务端环境变量派生 tenant/app/environment Scope，并限制时间范围和单轮调用次数。
- Query、Evidence、Model 与 Agent API 强制认证/RBAC；SDK Write Key 绑定 tenant/app/environment/Origin。
- MCP 子进程只继承显式白名单配置，不继承 DeepSeek/Qwen 等模型 API Key。
- `.env` 已被 Git 忽略；不得提交真实 API Key、Token 或客户数据。
- AWS 部署、付费模型调用和生产环境变更必须另行确认成本、目标账户、回滚方案与验证范围。

## 已知未完成项

1. 自动化可访问性专项审计，以及 macOS 之外的视觉基线。
2. Web chunk 拆分与性能预算。
3. 真实 DeepSeek/Qwen 评测；当前诊断主链使用确定性 Workflow，不依赖付费模型。
4. AWS ECS/CloudWatch 实际部署任务 `T-PIPE-006`，仍保持阻塞。
5. 正式身份提供方（OIDC/BFF Session）；当前静态 Token Registry 和 `VITE_AIOPS_DEV_TOKEN` 仅用于本地开发。
