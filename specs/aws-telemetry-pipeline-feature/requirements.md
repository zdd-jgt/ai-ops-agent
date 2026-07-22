# AWS Telemetry Pipeline Feature Requirements

## Feature 信息

- ID：F-002
- 状态：pending；真实 AWS 验证 blocked until approval。
- depends_on：F-001

## 目标

交付可本地验证、可部署到 ECS 的模块化 Telemetry Service，在写入 CloudWatch Logs 前完成接入、清洗、标准化、限流、审计，并提供受控查询 API。

## 非目标

- 不引入 Kafka、OpenSearch、ClickHouse、Firehose 或跨区域高可用。
- 不允许客户端或模型提交任意 Logs Insights 查询。
- 本 Feature 不创建未经确认的真实 AWS 资源。

## 功能需求

- `REQ-PIPE-001`：实现 `POST /v1/telemetry/batches` 并验证写入标识、Origin、Schema、大小和数量。
- `REQ-PIPE-002`：实现服务端脱敏、截断、路由标准化、属性白名单、时间校验和批次内去重。
- `REQ-PIPE-003`：输出一行一个版本化 JSON 事件，并支持本地 Sink 与 CloudWatch/`awslogs` Sink。
- `REQ-PIPE-004`：实现固定模板的性能概览、页面统计、日志搜索和日志详情 Query API。
- `REQ-PIPE-005`：限制时间范围、结果数、扫描量、并发和超时，并记录查询审计。
- `REQ-PIPE-006`：提供 ECS/Fargate、ALB、CloudWatch Log Group 和最小 IAM 的准备性配置。
- `REQ-PIPE-007`：高基数字段不得成为 EMF Metric Dimension。

## 非功能需求

- 无法安全清洗的事件失败关闭。
- API Key、AWS 凭据和禁止字段不得写日志。
- 开发环境保留期推荐 7 天，实际创建前确认。
- 正常事件 2 分钟内可查询是待真实 AWS 验证目标。

## 边界情况

- 伪造 Origin、无效写入标识、超大批次、未来/过旧时间戳。
- CloudWatch 限流、Logs Insights 查询排队、超时和部分结果。
- 重复批次、部分事件非法、Sink 失败。
- 路由/版本/会话高基数和恶意属性嵌套。

## 验收标准

- `AC-PIPE-001`：合法批次被接收，非法写入标识、Origin、Schema 和超限载荷被稳定拒绝。
- `AC-PIPE-002`：服务端清洗确保禁止字段不进入 Sink，对应 `AC-MVP-003`。
- `AC-PIPE-003`：事件被标准化、去重并输出版本化单行 JSON，对应 `AC-MVP-004`。
- `AC-PIPE-004`：固定 Query API 正确限制 Scope、时间、结果与并发。
- `AC-PIPE-005`：任意查询文本、跨应用和超范围请求被拒绝，对应 `AC-MVP-008`、`AC-MVP-009`。
- `AC-PIPE-006`：本地 Sink 完成端到端契约验证，无 AWS 账户也可开发。
- `AC-PIPE-007`：获得确认后，真实 ECS 到 CloudWatch 链路满足可查询目标，对应 `AC-MVP-010`。

## 依赖与开放问题

- Fargate/EC2、ALB/API Gateway、区域、VPC、域名、证书、WAF、预算均待确认。
- 用户身份与 RBAC 在 MVP 中可用本地开发身份替身，但真实环境不可跳过。
- CloudWatch Logs Insights 模板和扫描预算需用真实数据校准。
