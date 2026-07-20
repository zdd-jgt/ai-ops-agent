# 阶段 0：关键技术验证

## 目标

证明 Agent Runtime、MCP、模型 Provider、本地模型、Workflow 状态、PostgreSQL、OpenTelemetry 和完全断网链路可行，为第一期选型提供证据。

阶段范围、交付物和退出条件以 [总需求大纲](../../需求大纲.md) 的“阶段 0”章节为准。

## 当前文档

1. [Agent Runtime 与 Mastra 适配方案](agent-runtime-design.md)
2. [第一期测试与评估计划中的 Mastra 技术验证](../phase-1/test-and-evaluation-plan.md#mastra-技术验证测试)
3. [本地 MCP Server 与 Agent 工具调用](../phase-1/local-mcp-server.md)
4. [模型策略与 Air-Gapped 启动门禁](../../04-data-security-and-model-strategy.md)
5. [硬件基线](../../06-hardware-baseline.md)

## 退出结果

阶段结束时至少形成：

- Mastra 采用或不采用的 ADR。
- DeepSeek、Qwen、Custom OpenAI-compatible 与本地 Provider 的契约测试结果。
- 本地模型和 Air-Gapped 主机预检结果。
- MCP、Workflow Snapshot、OTel 和断网验证证据。
- 第一期开工所需的最终技术栈与已知限制。
