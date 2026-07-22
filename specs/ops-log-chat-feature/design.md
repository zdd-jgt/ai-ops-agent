# Ops Log Chat Feature Design

## 架构

```text
Chat UI -> Agent Runtime/Workflow -> MCP Client -> Local MCP Server
                                                -> Telemetry Query API
                                                -> Evidence Response
```

## 模块边界

- `apps/mcp-server/src/tools/frontend-observability`：四个工具、输入 Schema、Scope 校验和结果裁剪。
- `apps/agent-runtime/src/workflows/frontend-diagnosis`：确定性步骤、预算和失败语义。
- `apps/agent-runtime/src/agents/ops-chat`：提示模板、模型 Provider 与结构化回答。
- `apps/web/src/features/ops-chat`：聊天和 Evidence 展示。

## Workflow

```text
validate_question
-> resolve_scope_and_time
-> choose_readonly_tool
-> collect_evidence
-> validate_tool_result
-> compose_answer
-> attach_evidence_and_missing_data
```

未提供 Scope 时要求用户补充或使用页面当前上下文，不能猜测其他应用。工具返回的不可信日志内容只作为数据，不得作为指令。

## MCP 契约

- 输入只接受枚举、受控字符串、UTC 时间范围和上限。
- MCP Server 从服务端身份派生 Scope，不信任模型传入租户权限。
- 返回 `query_status`、`actual_filters`、`time_range`、`items/aggregates`、`evidence_ids`、`truncated`。
- 不返回 AWS 凭据、底层 Query ID 的敏感关联或未脱敏原始字段。

## 模型与失败处理

- 模型网关适配 DeepSeek/Qwen 差异，Agent 只依赖项目接口。
- Tool timeout、partial 和 denied 必须进入结构化状态，回答模板显式说明。
- 不提供云模型自动 fallback；开发时切换 Provider 必须显式配置并分别回归。

## 安全

- 任意查询和写操作在 MCP/API 层不可表达。
- 工具结果视为不可信输入并与系统指令分隔。
- Agent 调用预算、循环次数和响应大小由 Workflow 控制。
