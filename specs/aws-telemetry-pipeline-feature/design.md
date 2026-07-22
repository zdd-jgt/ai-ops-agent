# AWS Telemetry Pipeline Feature Design

## 推荐架构

```text
SDK -> HTTPS/ALB -> ECS Telemetry Service
                       |- Ingest Controller
                       |- Policy/Cleaner
                       |- Structured stdout -> awslogs -> CloudWatch Logs
                       `- Query Controller -> Logs Insights
```

MVP 使用一个部署单元但保持模块边界，吞吐或隔离需求出现后再引入队列和独立 Worker。

## 计划模块

- `apps/telemetry-api/src/ingest`：批次接入和稳定错误码。
- `apps/telemetry-api/src/policy`：Origin、Scope、配额和数据策略。
- `apps/telemetry-api/src/cleaner`：脱敏、标准化、截断和去重。
- `apps/telemetry-api/src/sinks`：本地与结构化 stdout Sink。
- `apps/telemetry-api/src/query`：固定 Logs Insights 模板和异步轮询。
- `infra/aws/telemetry`：只做可审查部署配置，未经确认不 apply。

## API 与失败语义

- 批次全局错误返回 4xx；部分事件错误返回批次结果和逐项稳定代码。
- 429 返回重试提示；内部 Sink 失败返回 5xx，不记录原始敏感载荷。
- Query API 不接收 query string，只把结构化过滤器编译为服务端模板。
- Logs Insights 异步状态映射为 `pending|complete|partial|failed|timeout`。

## CloudWatch 设计

- ECS Container 只输出清洗后的单行 JSON 到 stdout/stderr，Task 使用 `awslogs`。
- Log Group、Region 和 Stream Prefix 显式配置。
- 如使用 EMF，只允许 `app_id`、`environment`、受控 `route_template` 等低基数字段；禁止 session/event/request/user ID。
- Dashboard/Agent 经 Query Service 使用最小权限，浏览器不直接调用 CloudWatch。

## 安全

- 浏览器写入标识只用于路由和配额，不视为秘密。
- Origin 白名单不是唯一安全措施，必须叠加限流、配额、Schema 和载荷上限。
- Task Role 分离写日志和查询权限；不使用长期 AWS Access Key。
- 全部真实部署、证书、DNS、IAM 和费用操作由 ops task 门控。

## 发布影响

- 本地开发使用 Mock/Local Sink。
- AWS 配置仅生成和审查；实际创建属于外部副作用，需要明确确认和回滚计划。
