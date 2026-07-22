# Tenant Scope Authentication Feature Requirements

## Feature 信息

- ID：F-005
- 状态：pending
- depends_on：F-002、F-004 本地实现

## 目标

为第一期“单组织、多应用、多环境”补齐最小认证与服务端 Scope：所有身份、租户和应用边界由服务端凭据派生，事件、查询、Evidence、Agent 和 MCP 全链路保留 `tenantId`，以后升级多租户时不修改核心契约。

## 非目标

- 不接入真实 OIDC、IAM Identity Center 或客户身份平台。
- 不创建 AWS 资源、不配置真实密钥、不部署外部环境。
- 不实现多组织管理后台、用户邀请、计费或组织切换。
- 不把浏览器中的开发 Token 描述为生产级用户登录方案。

## 用户故事

- 平台管理员可以在服务端注册 Write Key，并把它限定到一个租户、应用、环境和 Origin。
- 查询用户只能访问其服务端身份允许的应用和环境，不能通过修改查询参数扩大 Scope。
- Agent 只能在调用者租户和应用范围内诊断，MCP 不能从模型输入接受租户授权。
- 本地开发可以使用显式配置的开发身份，生产模式配置缺失时失败关闭。

## 功能需求

- `REQ-AUTH-001`：定义统一的 `AuthPrincipal`，至少包含 subject、tenantId、roles、allowedAppIds 和 allowedEnvironments。
- `REQ-AUTH-002`：Write Key 注册表把 Key 映射到 tenantId、appId、environment 与 Origin；不存在、跨应用、跨环境或跨 Origin 请求被拒绝。
- `REQ-AUTH-003`：采集服务忽略客户端租户声明，由服务端生成 `tenant_id`、`received_at` 和 `ingest_id` 后写入存储与 Sink。
- `REQ-AUTH-004`：Query、Model 管理和 Agent API 使用 Bearer 身份；Query 和 Agent Scope 由认证主体派生，Model 管理要求 admin 角色。
- `REQ-AUTH-005`：MCP Scope 包含 tenantId，Query API 调用使用独立服务身份；MCP 子进程只继承批准的最小环境变量集合。
- `REQ-AUTH-006`：认证拒绝、Scope 拒绝和成功访问记录不含原始 Token/Write Key 的结构化审计信息。

## 非功能需求

- Token 与 Write Key 使用恒定时间比较或等价安全比较，不写入日志、响应、Trace 或状态文件。
- `NODE_ENV=production` 时缺少身份/Write Key 配置必须失败关闭。
- 单组织默认值只能来自显式环境配置；业务代码不得硬编码 `default-org`。
- API 和 MCP Schema 保持版本化，内部字段使用 `tenant_id`，TypeScript 接口使用 `tenantId`。

## 边界情况

- 缺失、格式错误、未知或重复 Token。
- 已知 Token 请求未授权 app/environment。
- Write Key 与事件 app_id/environment 不匹配。
- Origin 缺失、伪造或不在允许列表。
- 客户端事件携带伪造 tenant_id。
- Evidence ID 属于另一个租户但 appId 相同。
- MCP 未配置 tenant 或服务 Token。

## 验收标准

- `AC-AUTH-001`：合法 Write Key 只能写入绑定的租户、应用、环境和 Origin，服务端存储事件带正确 `tenant_id`。
- `AC-AUTH-002`：未知 Key、跨应用、跨环境、跨 Origin和伪造 tenantId 均被稳定拒绝或覆盖，且日志不含凭据。
- `AC-AUTH-003`：Query 和 Evidence 在服务端强制 tenant/app/environment Scope，匿名访问与跨 Scope 请求返回 401/403/404。
- `AC-AUTH-004`：Agent API 认证后只使用主体允许的 Scope；请求体不能提交 tenantId 扩权。
- `AC-AUTH-005`：MCP 使用固定 tenant Scope 和独立 Query 服务 Token，子进程环境不包含模型 API Key 等无关秘密。
- `AC-AUTH-006`：Model 状态需要已认证身份，切换模型仅 admin 可执行。

## 依赖与开放问题

- 本地使用静态 Token Registry 作为身份提供者替身；生产交付前必须替换或接入正式 OIDC/BFF Session。
- Web 开发身份如何注入由本 Feature 提供显式开发配置，不能视为生产登录方案。
