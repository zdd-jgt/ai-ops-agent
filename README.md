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
- 云上版本通过可插拔模型网关支持客户选择模型 Provider；DeepSeek API 和 Qwen API 只是开发阶段的首批验证适配器，正式 AWS 交付继续保留 Amazon Bedrock 等原生适配能力。
- 完全断网版只连接本地模型服务，启动前执行主机硬件与运行环境预检，低于所选模型最低要求时阻止启动。
- 本地开发使用 MCP `stdio`，Kubernetes 内部使用 Streamable HTTP。

## 模型接入（规划）

当前项目尚处于设计阶段，以下能力尚未实现，但已经纳入第一阶段范围。

### 云端模型

- 模型网关采用 Provider 插件机制，不把产品绑定到 DeepSeek、Qwen 或单一云厂商。
- DeepSeek 和 Qwen 使用项目开发者自己的 API Key，作为首批适配和回归测试模型。
- 客户可以配置自己的 OpenAI-compatible 服务，包括 Base URL、模型名称和服务端 API Key 引用。
- 不兼容 OpenAI 协议的服务通过独立原生 Provider Adapter 接入，例如后续的 Amazon Bedrock。
- 新 Provider 必须先通过连通性、结构化输出、Tool Calling、超时和 Golden Incidents 测试，才能启用。
- API Key 只能保存在服务端环境变量或密钥系统中，不得进入浏览器、日志、Prompt、Trace 或 Git。

### 本地离线模型

本地模型权重不进入代码仓库和应用镜像，支持两种使用方式：

1. 使用规划中的 `aiops model import <离线模型包>` 导入默认目录 `/opt/aiops/models/`。
2. 在部署配置中指定客户已有的模型绝对路径，并以只读方式挂载给推理服务。

Air-Gapped 模式不会自动联网下载模型。启动前必须验证模型清单、权重哈希、CPU、内存、GPU、显存、磁盘和运行时兼容性；任一必需项不满足时，本地模型和 Agent Runtime 都不会启动，也不会回退到云端模型。

## 文档

完整设计入口见 [docs/README.md](docs/README.md)。项目关键上下文和开发约束见 [AGENTS.md](AGENTS.md)。
