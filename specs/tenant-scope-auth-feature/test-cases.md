# Tenant Scope Authentication Feature Test Cases

| ID | AC | 类型 | 优先级 | 前置/Fixture | 执行与预期 | 证据 |
|---|---|---|---|---|---|---|
| TC-AUTH-001 | AC-AUTH-001 | 单元/安全 | P0 | 显式 Write Key Registry | 合法 Key 解析为固定 tenant/app/env/origin Scope | 聚焦测试 |
| TC-AUTH-002 | AC-AUTH-002 | 单元/安全 | P0 | 未知 Key、错误 Origin、跨 app/env | 全部确定性拒绝且错误不含 Key | 聚焦测试 |
| TC-AUTH-003 | AC-AUTH-001, AC-AUTH-002 | API/安全 | P0 | 合法批次与伪造 tenant_id | Sink/Store 仅包含服务端 tenant_id、received_at、ingest_id | API 集成测试 |
| TC-AUTH-004 | AC-AUTH-003 | API/权限 | P0 | 缺 Token、错误 Token、合法 Principal | 匿名 401，合法 Scope 200 | API 集成测试 |
| TC-AUTH-005 | AC-AUTH-003 | API/权限 | P0 | 同 app 不同 tenant Evidence | 跨 tenant 不能读取或枚举 Evidence | API 集成测试 |
| TC-AUTH-006 | AC-AUTH-006 | API/RBAC | P0 | viewer 与 admin Principal | Model 状态需认证，切换仅 admin | API 集成测试 |
| TC-AUTH-007 | AC-AUTH-004 | Agent/权限 | P0 | Agent Principal 与跨 Scope 请求 | 认证、app/env 校验在创建 MCP Session 前生效 | Agent 测试 |
| TC-AUTH-008 | AC-AUTH-005 | MCP/权限 | P0 | tenant Scope 与服务 Token Fixture | 工具调用携带服务身份，tenant 不可由输入改变 | MCP 测试 |
| TC-AUTH-009 | AC-AUTH-005 | 安全 | P0 | Agent 进程含模型 Key Fixture | MCP 子进程环境不包含任何模型 Provider Key | Agent 测试 |

当前真实命令：`pnpm typecheck`、`pnpm test`、`pnpm test:e2e`、`pnpm build`。不调用 AWS、OIDC、付费模型或真实密钥。
