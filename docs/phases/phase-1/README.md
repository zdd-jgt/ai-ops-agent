# 第一期：只读智能诊断闭环

## 目标

交付“告警进入—事件聚合—证据收集—根因候选—处理建议—人工反馈”的只读闭环。第一期不默认执行生产写操作。

## 阅读顺序

1. [范围与验收](scope.md)
2. [可观测性、拓扑与事件中心](observability-topology-and-event-center.md)
3. [本地 MCP Server 与 Agent 工具调用](local-mcp-server.md)
4. [领域模型与术语](domain-model-and-glossary.md)
5. [安全威胁模型](security-threat-model.md)
6. [非功能要求](non-functional-requirements.md)
7. [测试与评估计划](test-and-evaluation-plan.md)
8. [阶段 0 Agent Runtime 选型](../phase-0/agent-runtime-design.md)

## 公共依赖

- [项目愿景](../../00-project-vision.md)
- [目标架构](../../01-target-architecture.md)
- [私有化与完全断网](../../03-private-deployment-and-air-gap.md)
- [数据安全与模型策略](../../04-data-security-and-model-strategy.md)
- [硬件基线](../../06-hardware-baseline.md)
- [待确认事项](../../07-open-decisions.md)

## 当前状态

- 状态：需求与架构设计。
- Agent Runtime：Mastra 为推荐候选，等待阶段 0 验证。
- 执行边界：只读诊断为主，保留人工审批入口，不默认修改生产环境。
- 模型：云上支持可插拔 Provider；Air-Gapped 只使用通过预检的本地模型。
- 实施任务和发布回滚文档：尚未创建，进入正式编码前补齐。
