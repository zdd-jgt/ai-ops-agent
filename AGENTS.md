# AGENTS.md

## 项目定位

- 正式名称：智能运维大脑。
- 英文能力描述：AI Ops Agent。
- 当前阶段：产品与架构设计，尚未开始正式实现。
- 项目面向 AWS 云上和本地私有化环境提供两套独立部署方案，共享产品能力、数据协议和核心代码，但运行时默认不互通、不共享业务数据。
- 项目目标不是用大模型替代监控工具，而是把指标、日志、链路、资源拓扑、变更和运维知识组织成可验证的故障处理闭环。

## 开始工作前

1. 阅读 `docs/README.md`。
2. 根据任务阅读对应专题文档和 `docs/07-open-decisions.md`。
3. 不得把“推荐”或“待验证”写成已经确认的实现。

## 已确认边界

- AWS 云上版与本地私有化版独立部署，默认不共享运行数据。
- 私有化版必须支持完全断网。
- Kubernetes 优先，同时兼容虚拟机、物理机和传统服务。
- 第一期只读诊断，不默认执行生产变更。
- Agent 通过本地 MCP Server 使用受控工具；遥测采集不经过 MCP。
- 禁止向 Agent 暴露任意 Shell、SQL、SSH、脚本或 kubectl 工具。
- 飞书和企业微信是可选通知渠道，不是事件事实来源。

## 第一期目标

1. 接入告警、指标、日志、Trace、Kubernetes 和变更事件。
2. 对信号进行标准化、去重、抑制和事件聚合。
3. 建立内部事件中心保存故障事实和处理时间线。
4. 结合服务目录、动态拓扑、变更记录和运维知识收集证据。
5. 输出根因候选、置信度、反证、缺失信息和处理建议。
6. 通过飞书、企业微信或内网渠道通知并跟踪处理进度。
7. 保留人工审批入口，但第一期不默认修改生产环境。

## 架构原则

- 规则、统计和日志聚类负责发现异常，大模型负责关联、解释和生成建议。
- 原始运维数据先在本地过滤、脱敏和聚合，再进入模型路由。
- 密钥、Token、Cookie、客户业务数据和数据库原始记录不得进入模型。
- 诊断结论必须保留来源、Evidence、时间范围、置信度和缺失信息。
- 声明式服务目录、云资源关系、运行时拓扑和变更时间线分别维护，再在 Incident 上下文中合并。
- 监控、模型、存储、MCP 和通知通过适配器接入，避免绑定单一厂商。
- 完全断网版的安装、授权、升级、模型、知识库和依赖必须离线交付。

## 推荐技术方向

- 采集：OpenTelemetry Collector。
- 指标：Prometheus；日志：Loki；链路：Tempo；展示：Grafana；告警：Alertmanager。
- 事件中心：独立服务和 PostgreSQL。
- Agent 工具：自建本地 MCP Server；开发使用 `stdio`，Kubernetes 内部使用 Streamable HTTP。
- Agent Runtime：优先验证 Mastra Workflow、MCP、PostgreSQL、OpenTelemetry 和 Scorers。
- 模型：统一可插拔模型网关；云上产品支持客户配置 Provider，DeepSeek API 和 Qwen API 只是开发阶段首批适配器，正式 AWS 交付保留 Bedrock 等原生适配；完全断网版使用本地推理服务。
- Air-Gapped 启动前必须执行主机与所选模型的兼容性预检；低于最低配置、无法确认关键资源或缺少离线权重时失败退出，不允许自动切换云模型或低规格 CPU 模式。

## 实施约束

- Mastra 是 Agent Runtime 推荐候选，完成技术验证前不得视为最终绑定。
- 完全断网版不得依赖 Mastra Cloud、Memory Gateway、Cloud Exporter、动态模型发现或其他公网服务。
- 诊断输出必须包含来源、证据、时间范围、置信度和缺失信息。
- 所有工具执行必须经过服务端身份、Scope、参数和数据范围校验。
- 不得创建 AWS 资源、启用付费服务、购买硬件或执行外部安全扫描，除非用户明确确认。
- 架构决策变化时同步更新本文件、相关专题文档和待确认事项。

## 文档入口

- `docs/README.md`：完整阅读顺序。
- `docs/需求大纲.md`：整体规划、阶段路线和统一需求模板。
- `docs/phases/README.md`：分期文档规范与阶段索引。
- `docs/phases/phase-0/README.md`：阶段 0 技术验证入口。
- `docs/phases/phase-1/README.md`：第一期完整文档入口。
- `docs/01-target-architecture.md`：目标架构。
- `docs/03-private-deployment-and-air-gap.md`：私有化与完全断网。
- `docs/phases/phase-1/local-mcp-server.md`：MCP Server 与工具边界。
- `docs/phases/phase-1/security-threat-model.md`：第一期安全基线。
- `docs/phases/phase-0/agent-runtime-design.md`：Mastra Agent Runtime 候选方案。
