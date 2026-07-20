# 测试与评估计划

## 目标

验证智能运维大脑不仅“能生成答案”，还能够稳定聚合事件、使用正确工具、引用真实证据、拒绝越权操作，并在模型或基础设施变化后及时发现回归。

## 测试分层

### 确定性单元测试

- Schema 验证。
- 告警指纹和幂等键。
- 严重级别映射。
- Incident 状态转换。
- 关联规则和时间窗口。
- 数据分级、脱敏和字段白名单。
- MCP 参数、Scope、租户和环境校验。
- 审批参数哈希、过期和单次使用。

### 组件与契约测试

- Prometheus、Kubernetes、事件中心适配器。
- MCP Client/Server 兼容性。
- DeepSeek、Qwen、Custom OpenAI-compatible 和本地模型 Provider 的契约、能力探测、结构化输出、超时和显式降级。
- API Key 缺失、无效、区域/Base URL 不匹配时失败且日志不泄露密钥。
- Custom Provider 的管理员权限、HTTPS、目标白名单、SSRF、DNS 重绑定和租户密钥隔离测试。
- 模型规格清单解析以及 CPU、内存、GPU、显存、磁盘、驱动和权重预检。
- Workflow Snapshot 暂停、恢复和重复投递。
- PostgreSQL 迁移、并发更新和回滚。
- 通知渠道回调幂等。

### 场景与 Agent 评估

- 使用固定输入的 Golden Incidents。
- 检查工具选择、参数范围、证据引用和根因候选排序。
- 同一场景重复运行，记录结果波动。
- 替换模型、提示模板、工具 Schema 或知识库后执行回归。

### 安全与断网测试

- 提示注入、知识库投毒和恶意 MCP 返回。
- 跨租户、跨环境、超范围查询。
- 任意 Shell、SQL、URL、SSH 和 kubectl 请求。
- Token、Cookie、密码和客户数据泄漏检测。
- 审批重放和参数篡改。
- 阻断公网后的安装、启动、诊断、升级和恢复。
- Air-Gapped 配置中出现云端 Provider、外部 Base URL 或 API Key 引用时启动失败。
- 本地模型不可用时不会回退 DeepSeek、Qwen、Bedrock 或其他公网模型。

### 性能与韧性测试

- 告警突发和重复投递。
- 慢日志后端、Prometheus 超时和 Kubernetes API 限流。
- 模型超时、无效 JSON、拒绝服务和降级。
- MCP Server、Agent Runtime 和数据库重启。
- 长时间暂停 Workflow 恢复。
- 存储接近容量上限。

## 第一批 Golden Incidents

| 场景 | 主要输入 | 期望根因候选或结论 |
|---|---|---|
| Pod CrashLoopBackOff | K8s Event、容器日志、最近发布 | 镜像、配置、依赖或启动异常候选 |
| 数据库连接池耗尽 | 错误率、连接数、超时日志、拓扑 | 连接泄漏、容量不足或下游变慢候选 |
| 发布后错误率上涨 | 发布变更、版本、指标、Trace | 新版本变更作为高优先候选 |
| 下游 API 超时 | Trace、依赖拓扑、下游指标 | 下游服务或网络延迟候选 |
| 节点磁盘耗尽 | Node 指标、Pod 调度和日志 | 磁盘容量及受影响工作负载 |
| Kubernetes 节点不可用 | Node 状态、事件、Pod 分布 | 节点故障及影响范围 |
| Redis 命中率下降 | 缓存命中、数据库负载、发布记录 | Key 策略、容量或发布变更候选 |
| WAF 异常流量 | WAF 发现、请求率、错误率 | 安全事件与业务影响关联，不主动攻击目标 |

每个 Golden Incident 保存：

- 固定输入数据和时间线。
- 允许调用的工具及最大次数。
- 必须发现的关键 Evidence。
- 可接受根因候选集合和禁止结论。
- 预期受影响服务。
- 预期安全与权限行为。
- 人工评审说明。

## 发布门禁

以下项目必须使用确定性测试，不能只依赖 LLM Judge：

- 结构化输出 Schema 合法率 100%。
- 越权和任意命令阻断率 100%。
- 跨租户数据泄漏为 0。
- 已要求 Evidence 的结论引用完整率 100%。
- 幂等重试不生成重复 Incident 或动作。
- Air-Gapped 测试中公网请求为 0。
- Air-Gapped 硬件或模型预检任一必需项失败时，本地模型和 Agent Runtime 启动数均为 0。
- 审批过期、重放和参数不匹配全部被拒绝。

模型质量指标先建立基线，再设置提升或不退化门禁：

- Top-3 根因候选命中率。
- Evidence Precision/Recall。
- 工具选择正确率。
- 无效或不必要工具调用率。
- 人工采纳率。
- 无证据确定性断言率。
- 平均工具调用数和诊断时间。

## Mastra Scorers 使用建议

Mastra Scorers 可以用于 Agent 或 Workflow Step 的异步质量评估，适合：

- 回答相关性和完整性。
- 是否引用所需 Evidence。
- 根因候选是否覆盖 Golden Incident 要点。
- 处理建议是否与权限级别匹配。
- 工具调用序列和任务完成情况。

但安全、权限、Schema、幂等和断网要求必须由普通测试代码和发布门禁验证。LLM Scorer 只作为补充，不作为安全放行依据。

## Mastra 技术验证测试

- 同一组 Golden Incidents 分别经过 DeepSeek、Qwen、至少一个 Custom Provider 和本地 Provider 回归，记录能力差异而不是假设完全兼容。
- Workflow 顺序、分支、循环限制和错误处理。
- `suspend/resume` 后状态、Evidence 引用和幂等性保持正确。
- PostgreSQL 存储下并发 Run 与重启恢复。
- MCP `stdio` 和 Streamable HTTP 工具一致性。
- OTel Trace 输出到本地后端且敏感信息已过滤。
- 本地模型返回无效 JSON 时能够重试、修复或明确失败。
- 禁用公网后不访问 Mastra Cloud、Memory Gateway 或动态模型注册表。
- 边界值覆盖低于、等于和高于最低 CPU、内存、显存与磁盘要求；无法识别硬件信息时按失败处理。

## 测试证据

每次发布保留：

- Git Commit 和构建版本。
- 模型、量化和提示模板版本。
- 工具 Schema 和知识库版本。
- Golden Incident 数据集版本。
- 确定性测试结果。
- Scorer 结果及与上一版本对比。
- 性能与断网测试报告。
- 已知问题和人工放行记录。

## 参考资料

- [Mastra Scorers](https://mastra.ai/blog/mastra-scorers)
- [Mastra Observability](https://mastra.ai/ai-agent-observability)
- [Mastra Gates and Verdicts](https://mastra.ai/blog/introducing-gates-and-verdicts)
