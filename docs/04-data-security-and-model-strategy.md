# 数据安全与模型策略

## 数据分级

| 等级 | 示例 | 默认策略 |
|---|---|---|
| S0 禁止进入模型 | 密码、Token、Cookie、密钥、客户请求正文、数据库原始记录 | 采集阶段删除，禁止出域 |
| S1 高敏运维数据 | 原始日志、完整 Trace、SQL 参数、内部 IP、完整拓扑、漏洞细节 | 仅在部署环境内部保存和分析 |
| S2 脱敏诊断数据 | 错误码、脱敏堆栈、指标窗口、匿名服务标识、异常摘要 | 策略允许后进入指定模型 |
| S3 普通知识 | 运维手册、公开文档、通用排障知识 | 可进入知识库和模型 |

## 数据处理链路

```text
数据源
  -> 本地 Collector
  -> 字段白名单
  -> 删除/哈希/截断
  -> 过滤和采样
  -> 事件聚合与证据摘要
  -> 数据策略网关
  -> 本地模型或云端模型
```

优先生成小型“诊断证据包”，不要把大量原始日志直接发送给模型。证据包包含服务、环境、时间窗口、异常指标、主要错误模式、依赖关系和最近变更，并保留返回原始系统复核的引用。

## 模型部署方案

### 方案 A：全部云端模型

- AWS 和私有化环境都调用托管模型。
- 上线快，但不满足完全断网要求。

### 方案 B：全部自建模型

- AWS 和本地都自行维护推理基础设施。
- 技术栈一致，但 GPU、升级和模型运维成本较高。

### 方案 C：双版本独立适配

- 云上产品通过模型网关接入客户批准的模型 Provider。
- DeepSeek API 和 Qwen API 只作为开发阶段首批实现与验证适配器，不限制客户模型选择。
- 正式 AWS 交付保留 Bedrock 或批准的 AWS 推理服务适配能力。
- 私有化版默认通过模型网关接入本地推理服务。
- 共享提示模板、工具协议、评测集和结构化输出格式。
- 当前推荐作为基础产品架构。

### 方案 D：本地优先、云端增强

- 敏感任务在本地处理，允许出域的复杂任务发送云端模型。
- 适用于 Private Connected，不适用于 Air-Gapped。

## Provider 扩展策略

| Provider | 接入方式 | 使用范围 | 状态 |
|---|---|---|---|
| DeepSeek API | OpenAI-compatible Chat Completions | 开发者自有 Key，首批适配与回归验证 | 已确认首批实现 |
| Qwen API | 阿里云百炼 OpenAI-compatible API | 开发者自有 Key，首批适配与回归验证 | 已确认首批实现 |
| Custom OpenAI-compatible | 客户配置 Base URL、模型和密钥引用 | 云上客户自有或第三方模型服务 | 已确认架构支持 |
| Local | 本地 OpenAI-compatible 推理端点 | Air-Gapped 与本地模型验证 | 已确认必须支持 |
| Amazon Bedrock | 独立 Provider Adapter | 正式 AWS 交付候选 | 后续验证 |

DeepSeek 和 Qwen 不是面向客户的固定默认模型。客户模型若兼容项目支持的 OpenAI 协议子集，可以通过 Custom Provider 接入；不兼容时需要实现并验证独立原生 Adapter。

模型网关对上层提供项目自有接口，不把 OpenAI SDK 类型直接泄漏到领域服务。OpenAI-compatible 只代表协议兼容，不假设各厂商支持完全相同的参数、Responses API、结构化输出或工具调用行为。

部署 Profile 使用固定 Provider 白名单：

| Profile | 允许的 Provider | 启动要求 |
|---|---|---|
| `cloud-dev` | `deepseek`、`qwen`、已注册的 Custom Provider、显式测试用 `mock` | 选中的 Provider 必须存在有效的服务端密钥引用并通过能力探测 |
| `aws` | 客户批准并由管理员注册的 OpenAI-compatible 或原生 Provider | Provider、区域、网络出口和数据等级策略必须匹配 |
| `private-connected` | `local`；经客户和数据策略批准后可增加指定云 Provider | 所有公网请求经过代理、白名单和出域审计 |
| `air-gapped` | 仅 `local` | 禁止外部 Base URL、云端密钥引用、动态发现和云端回退 |

启动时先验证 Profile 与 Provider 的组合。非法组合直接失败，不能依靠“网络当前不可用”来实现隔离。

每个云端 Provider 至少通过配置声明：

- `provider_id`、`base_url`、区域和模型名称。
- API Key 对应的服务端环境变量或密钥引用。
- Chat、Streaming、JSON Schema、Tool Calling 和推理模式能力。
- 请求超时、重试、并发、限流和最大上下文。
- 允许处理的数据等级和降级目标。

DeepSeek 和 Qwen 的 API Key 只允许在服务端读取，不进入浏览器、Prompt、Trace、日志、数据库或 Git。仓库只提供不含真实值的 `.env.example`；生产环境使用 AWS Secrets Manager、Vault 或客户批准的密钥系统。

客户自定义 Provider 还必须满足：

- 只能由管理员注册，普通用户不能提交任意 Base URL。
- Base URL 必须使用 HTTPS，并通过域名/IP 白名单、DNS 重绑定防护和私网地址策略，避免 SSRF。
- API Key 按客户、租户或项目隔离，不允许跨租户复用或读取。
- 启用前执行能力探测和契约测试，记录实际支持的 Chat、Streaming、Tool Calling、JSON Schema 与 Embedding 能力。
- Provider 不支持某项能力时必须明确报错或按显式策略路由，不能假装兼容。

## 模型网关职责

- 按部署 Profile、数据级别和任务类型路由模型。
- 统一鉴权、限流、超时、重试和熔断。
- 在模型调用前执行数据策略检查。
- 记录模型、版本、提示模板、输入摘要、输出和耗时。
- 对结构化输出执行 Schema 校验。
- 支持模型降级和替换。
- 禁止业务模块直接绑定某个厂商 SDK。

## Air-Gapped 模型启动门禁

Air-Gapped Profile 采用失败关闭策略，启动顺序固定为：

```text
读取部署 Profile 与本地模型清单
  -> 检查当前主机/推理节点配置
  -> 检查驱动、运行时、权重、哈希和磁盘空间
  -> 全部通过后启动本地模型服务
  -> 执行健康检查和能力探测
  -> 成功后再启动 Agent Runtime
```

- 最低要求由版本化的模型规格清单声明，不能只在启动脚本中硬编码。
- 实际要求取“平台最低基线”和“所选模型要求”中的较高值。
- CPU、内存、GPU 显存、磁盘、架构、操作系统、GPU 驱动或权重完整性任一项不满足时，预检以非零状态退出。
- 无法读取关键硬件信息视为不通过，不得按满足处理。
- 输出必须列出检查项、当前值、要求值、结果和修复建议，不得打印机器序列号、密钥等敏感信息。
- 不允许自动降级到 CPU、小模型或云端 Provider；变更模型规格必须由用户显式修改配置后重新预检。
- 单机 Docker 部署检查当前宿主机；Kubernetes 部署检查所有被选作推理节点的主机，并通过标签、污点和资源请求避免调度到未验证节点。

## 本地模型评估维度

- 中文运维语义和错误日志理解。
- Kubernetes、Linux、数据库和网络知识。
- 工具调用与 JSON 结构化输出稳定性。
- 长上下文和多证据关联能力。
- 幻觉率和拒绝无证据推断的能力。
- GPU 显存、首 Token 延迟、吞吐和并发。
- 模型许可证是否允许企业私有化交付。
- 完全断网安装、升级和量化版本可维护性。

## 执行安全等级

| 等级 | 能力 | 当前方向 |
|---|---|---|
| L0 | 查询文档和事件中心 | 允许自动执行 |
| L1 | 只读查询指标、日志、K8s 状态 | 第一期允许，必须审计 |
| L2 | 无业务影响的诊断采集 | 可人工审批后执行 |
| L3 | 重启、扩容、回滚、修改配置 | 后续阶段，必须审批和回滚 |
| L4 | 删除数据、修改权限、网络封禁 | 默认禁止，需单独安全设计 |

任何执行都必须经过工具白名单、参数校验、最小权限、幂等检查、超时控制、执行前快照、结果验证和审计。

## 不可信 AI 输入原则

- 日志、Trace、告警描述、工单、Runbook、代码注释和 MCP 返回内容全部视为不可信输入。
- 从数据中读取到的“忽略规则”“执行命令”“泄露提示词”等文本不得改变系统指令或权限策略。
- 检索结果必须保留来源、版本和访问控制，不允许跨租户拼接上下文。
- 模型生成的查询和动作必须转换为结构化 Schema，并由服务端重新校验。
- 提示词、工具输入输出和 Agent Trace 在写入可观测系统前必须再次执行敏感信息过滤。

完整威胁与控制见 [第一期安全威胁模型](phases/phase-1/security-threat-model.md)。

## 参考资料

- [DeepSeek OpenAI-compatible API](https://api-docs.deepseek.com/zh-cn/)
- [阿里云百炼通过 OpenAI 接口调用 Qwen](https://help.aliyun.com/zh/model-studio/compatibility-of-openai-with-dashscope)
- [OpenTelemetry 敏感数据处理](https://opentelemetry.io/docs/security/handling-sensitive-data/)
- [Amazon Bedrock 数据保护](https://docs.aws.amazon.com/bedrock/latest/userguide/data-protection.html)
- [Amazon Bedrock Guardrails 敏感信息过滤](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-sensitive-filters.html)
- [Amazon Bedrock 与 SageMaker 选择指南](https://docs.aws.amazon.com/decision-guides/latest/bedrock-or-sagemaker/bedrock-or-sagemaker.html)
