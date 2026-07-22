# Ops Log Chat Feature Requirements

## Feature 信息

- ID：F-004
- 状态：pending
- depends_on：F-002 query contract complete；默认在 F-003 后执行以避免 Web 共享文件冲突。

## 目标

交付一个只读运维聊天入口，让 Agent 通过受控 MCP 工具查询页面性能和前端日志，并返回带实际范围、Evidence 和不确定性说明的回答。

## 非目标

- 不允许模型生成任意 Logs Insights、Shell、SQL、AWS CLI 或写操作。
- 不做多 Agent 网络、自动修复和长期根因自学习。
- 不让模型直接持有 AWS 凭据。

## 功能需求

- `REQ-CHAT-001`：提供 `query_page_performance`、`list_slow_pages`、`search_frontend_logs`、`get_frontend_log_event` MCP 工具。
- `REQ-CHAT-002`：所有工具实施 Scope、时间范围、结果数、调用预算和字段白名单校验。
- `REQ-CHAT-003`：Agent 解析用户意图后只选择批准的结构化工具，不生成任意底层查询。
- `REQ-CHAT-004`：回答包含实际查询范围、关键指标、日志模式、Evidence 引用、缺失信息和下一步只读建议。
- `REQ-CHAT-005`：聊天 UI 支持提问、运行状态、工具证据摘要、失败和无数据状态。
- `REQ-CHAT-006`：DeepSeek、Qwen 和 Mock Provider 使用相同 Golden Questions 回归。

## 非功能需求

- 单轮最多 4 次 Telemetry MCP 调用，默认不超过 1 小时查询范围。
- 工具超时和部分失败不得被模型描述为查询成功。
- Prompt、工具结果和 Trace 在记录前脱敏。
- 真实付费模型调用前需要明确确认费用和 Key 配置。

## 边界情况

- 用户未提供应用、环境、路由或时间范围。
- 日志为空、样本不足、Query timeout、权限不足和部分结果。
- Prompt 注入藏在日志 message/stack 中。
- 用户请求跨应用、24 小时以上、任意查询或生产写操作。

## 验收标准

- `AC-CHAT-001`：四个 MCP 工具具有稳定 Schema，合法请求映射到 Query API。
- `AC-CHAT-002`：越权、超范围、超预算和任意查询请求被确定性拒绝，对应 `AC-MVP-008`。
- `AC-CHAT-003`：Agent 能回答性能/日志 Golden Questions 并引用 Evidence，对应 `AC-MVP-007`。
- `AC-CHAT-004`：无数据、超时、部分失败时明确说明，不编造根因。
- `AC-CHAT-005`：日志中的提示注入不能改变工具白名单、Scope 或系统指令。
- `AC-CHAT-006`：聊天 UI 展示实际范围、运行状态和 Evidence，且不泄漏密钥或原始禁止字段。

## 依赖与开放问题

- Mastra 是否正式采用需阶段 0 验证；领域/MCP 契约不依赖 Mastra 私有类型。
- 默认使用 DeepSeek 还是 Qwen 作为开发模型待确认。
- 聊天 UI 是否与 Dashboard 同页或独立路由待视觉设计确认。
