# ADR: Mastra 采用为 Agent Runtime

## 状态

**✅ 已确认（2026-07-21）**

## 决策

Mastra v1 被正式采用为智能运维大脑第一期的 Agent Runtime。

## 验证结果

| # | 验证项 | 状态 | 证据 |
|---|--------|------|------|
| 1 | 创建 Mastra Workflow（`createWorkflow` + `createStep` + `.then()` + `.commit()`） | ✅ | `diagnosisWorkflow` 4 步骤完整执行 |
| 2 | Zod Schema 校验（inputSchema / outputSchema） | ✅ | 空输入、缺字段、超长输入均被 Zod 正确拒绝 |
| 3 | `createRun()` + `start()` 完整执行 | ✅ | status: "success"，返回结构化 answer + hypotheses |
| 4 | 类型安全的步骤链（TypeScript strict mode） | ✅ | 每个 step 的 inputSchema 匹配前一个 outputSchema |
| 5 | LibSQL Storage（Snapshot 持久化） | ✅ | :memory: 模式可用于测试，file: 模式用于开发 |
| 6 | MCPClient 配置（stdio + Streamable HTTP） | ✅ | 已配置 frontendObservability 服务器连接 |
| 7 | 独立于 Mastra 私有类型的领域接口 | ✅ | MCP 工具 Schema 和 Adapter 在 `@ai-ops/mcp-server` 包中独立定义 |
| 8 | Golden Questions 确定性测试 | ✅ | 10 个 Golden Question + 8 个 Mastra 验证测试全部通过 |

## 已知限制

| 限制 | 影响 | 缓解措施 |
|------|------|----------|
| 未连接真实 LLM Provider | Answer 使用固定模板生成 | `@ai-sdk/openai` 已安装，API Key 配置后可立即切换 |
| 未在 Air-Gapped 环境测试 | 离线约束未验证 | 需在隔离环境中验证 LibSQL + 本地模型 + 断网 |
| 未测试 suspend/resume | 人工审批 Workflow 未完整验证 | `run.resumeStream()` API 已就绪，需结合业务场景测试 |
| MCPClient 未连接运行中的 MCP Server | 工具调用使用 Mock 数据 | `getMCPServers()` 已配置，启动 mcp-server 后可端到端测试 |

## 不采用时的替换边界

以下组件不依赖 Mastra 私有类型，可在必要时替换：

- `packages/telemetry-contracts/` — 事件 Schema
- `apps/mcp-server/src/tools/` — MCP 工具定义
- `apps/mcp-server/src/policy/` — Scope/预算/裁剪策略
- `apps/web/src/features/ops-chat/` — Chat UI
- `apps/telemetry-api/src/` — Query API

唯一需要替换的部分是 `apps/agent-runtime/src/mastra/`，接口已在 `types.ts` 中定义。

## 下一步

1. 配置 DeepSeek/Qwen API Key → 启用真实 LLM 调用
2. 启动 mcp-server → 端到端 MCP 工具调用验证
3. Air-Gapped 环境验证 → 确认断网约束
4. 性能测试 → 确认 Offline POC 基线资源占用
