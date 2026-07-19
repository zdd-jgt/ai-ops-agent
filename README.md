# 智能运维大脑（AI Ops Agent）

智能运维大脑是一套面向 AWS 云上与完全离线私有化环境的企业级 AI Ops 平台。系统统一分析指标、日志、链路、告警、资源拓扑、变更记录和运维知识，提供异常聚合、辅助根因定位、性能与安全建议、事件跟踪以及受控自动化运维能力。

## 项目状态

当前处于产品与架构设计阶段，尚未进入正式编码。现有内容用于明确范围、风险、数据契约和第一期验收标准，不代表已经具备生产能力。

## 核心目标

- AWS 云上版与本地私有化版独立部署。
- 私有化版本支持完全断网运行。
- 以 Kubernetes 为主要环境，同时兼容虚拟机、物理机和传统服务。
- 聚合告警并建立内部事件中心。
- 基于拓扑、变更和历史证据生成可复核的根因候选。
- 第一阶段只读诊断，生产写操作必须经过审批、策略和审计。
- 通过本地 MCP Server 向 Agent 暴露受控工具，不暴露任意 Shell、SQL、SSH 或 kubectl。

## 第一期闭环

```text
遥测与告警接入
  -> 标准化、去重和事件聚合
  -> 补齐服务、拓扑和变更上下文
  -> Agent 调用受控 MCP 工具收集证据
  -> 输出根因候选、置信度和处理建议
  -> 人工确认与事件跟踪
  -> 恢复验证和经验沉淀
```

## 推荐技术方向

- OpenTelemetry、Prometheus、Loki、Tempo、Grafana、Alertmanager。
- PostgreSQL 作为事件中心和结构化状态存储。
- Mastra 作为第一期 Agent Runtime 候选，需通过本地与完全断网技术验证。
- AWS 版优先适配 Amazon Bedrock；私有化版连接本地模型服务。
- 本地开发使用 MCP `stdio`，Kubernetes 内部使用 Streamable HTTP。

## 文档

完整设计入口见 [docs/README.md](docs/README.md)。项目关键上下文和开发约束见 [AGENTS.md](AGENTS.md)。
