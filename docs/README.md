# AI Ops Agent 设计文档

本目录保存 AI Ops Agent 在正式编码前的产品与架构讨论结果。文档采用“已确认决策、推荐方案、待确认事项”分离的方式维护，避免把讨论中的假设误当成最终结论。

## 阅读顺序

1. [项目愿景](00-project-vision.md)
2. [目标架构](01-target-architecture.md)
3. [第一期范围](02-phase-1-scope.md)
4. [私有化与完全断网](03-private-deployment-and-air-gap.md)
5. [数据安全与模型策略](04-data-security-and-model-strategy.md)
6. [可观测性、拓扑与事件中心](05-observability-topology-and-event-center.md)
7. [硬件基线](06-hardware-baseline.md)
8. [待确认事项](07-open-decisions.md)

## 文档维护规则

- 已确认的产品方向同步写入根目录 `AGENT.md`。
- 技术选型未经过验证时标记为“推荐”，不要写成既定事实。
- 硬件容量必须结合模型、并发、每日遥测量和保留周期重新计算。
- 外部执行、云资源创建、付费服务和安全扫描必须单独确认。
- 每次实现应能追溯到第一期范围或后续明确批准的需求。

