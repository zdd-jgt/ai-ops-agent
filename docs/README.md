# 智能运维大脑（AI Ops Agent）设计文档

本目录保存“智能运维大脑”在正式编码前的产品与架构讨论结果。文档采用“已确认、推荐、待验证、待确认”四种状态维护，避免把方案建议或框架能力误当成已经完成的实现。

## 阅读顺序

1. [项目愿景](00-project-vision.md)
2. [需求大纲与整体分期规划](需求大纲.md)
3. [目标架构](01-target-architecture.md)
4. [第一期范围](02-phase-1-scope.md)
5. [私有化与完全断网](03-private-deployment-and-air-gap.md)
6. [数据安全与模型策略](04-data-security-and-model-strategy.md)
7. [可观测性、拓扑与事件中心](05-observability-topology-and-event-center.md)
8. [硬件基线](06-hardware-baseline.md)
9. [本地 MCP Server 与 Agent 工具调用](08-local-mcp-server.md)
10. [领域模型与术语](09-domain-model-and-glossary.md)
11. [安全威胁模型](10-security-threat-model.md)
12. [非功能要求](11-non-functional-requirements.md)
13. [测试与评估计划](12-test-and-evaluation-plan.md)
14. [Agent Runtime 与 Mastra](13-agent-runtime-design.md)
15. [待确认事项](07-open-decisions.md)

## 文档维护规则

- 已确认的产品方向同步写入根目录 `AGENTS.md`。
- 技术选型未经过验证时标记为“推荐”，不要写成既定事实。
- 硬件容量必须结合模型、并发、每日遥测量和保留周期重新计算。
- 外部执行、云资源创建、付费服务和安全扫描必须单独确认。
- 每次实现应能追溯到第一期范围或后续明确批准的需求。
- 框架自带能力不能替代项目自己的权限、审计、领域数据和安全边界。
