# 最小 MVP PRD：页面性能、前端日志与运维聊天

## 1. 文档状态

- 状态：推荐方案，等待技术 Spike 后固化。
- 所属阶段：第一期，只读智能诊断闭环。
- MVP 名称：Frontend Observability MVP。
- 更新时间：2026-07-20。
- 目标环境：云上开发环境；真实 AWS 部署和费用需单独确认。

## 2. 结论

页面性能监控、前端日志处理和 Agent 运维聊天应当一起建设，但按一条最小纵向链路拆成四个可独立验收的 Feature：

1. 前端性能与日志 SDK。
2. AWS ECS 日志接入与清洗服务。
3. 页面性能和日志可视化。
4. Agent 只读聊天查询。

它们共享同一套事件契约、清洗规则和查询服务，避免先做一套性能数据、再单独建设另一套 Agent 日志数据。

## 3. 背景与问题

当前项目还没有真实可观测数据。若直接开发通用 AI Ops Agent，无法验证模型能否获取真实证据、正确查询日志并形成可复核结论。

本 MVP 先从浏览器页面场景建立最短闭环：

```text
页面 SDK
  -> AWS ECS Telemetry Service
  -> 校验/脱敏/标准化/限流
  -> CloudWatch Logs
  -> 受控 Query API
  -> 性能与日志页面
  -> MCP 只读工具
  -> Agent 运维聊天
```

## 4. 目标

- 开发者可以在 Web 页面中接入一个轻量 TypeScript SDK。
- SDK 可以采集真实用户页面性能、JavaScript 错误和显式业务日志。
- AWS ECS 服务在数据进入 CloudWatch Logs 前完成 Schema 校验、脱敏、截断、标准化和限流。
- 用户可以在页面查看性能趋势、慢页面、错误趋势和清洗后的日志。
- 运维人员可以通过自然语言查询同一份性能和日志数据，并获得带时间范围、过滤条件和证据引用的回答。
- 形成后续 Kubernetes、后端日志和 Trace 接入可复用的 Event、Query 和 MCP 契约。

## 5. 非目标

MVP 不包含：

- 后端 APM、完整分布式 Trace 和数据库监控。
- Session Replay、用户输入录屏或请求/响应正文采集。
- 自动抓取全部 `console.log`；只采集错误、未处理 Promise 和显式 `sdk.log()`。
- Source Map 自动上传和源码定位。
- 实时流处理、Kafka、ClickHouse、OpenSearch 或自建日志集群。
- AI 自动执行修复、重启、扩容或发布回滚。
- 完整多租户计费、跨区域高可用和生产 SLA。
- Air-Gapped 本地模型部署；本 MVP 只为以后复用接口，不在当前 Intel Mac 上运行离线大模型。

## 6. 用户角色与核心场景

### 6.1 Web 开发者

- 初始化 SDK 并配置 `appId`、`environment`、`release`、上报地址和采样率。
- 查看某次发布前后的页面性能和错误变化。
- 通过显式 API 记录需要诊断的前端日志。

### 6.2 运维与 SRE

- 查看过去 15 分钟、1 小时或自定义时间范围的性能总览。
- 按应用、环境、版本和标准化页面路由筛选。
- 搜索错误日志并查看关联页面、版本、时间和匿名会话 ID。
- 在聊天中询问“过去 30 分钟 `/checkout/:id` 为什么变慢”。

### 6.3 平台管理员

- 创建应用接入配置和公开写入标识，不向浏览器分发 AWS 凭据。
- 配置允许来源、采样率、日志级别、保留期和用量上限。
- 查看数据拒绝、清洗、限流和 CloudWatch 查询审计。

## 7. MVP 功能范围

### 7.1 前端 Telemetry SDK

SDK 第一版支持：

- Core Web Vitals：LCP、INP、CLS。
- 辅助性能指标：FCP、TTFB、页面加载和路由切换耗时。
- `window.error`、资源加载失败和 `unhandledrejection`。
- 显式 `sdk.log(level, message, attributes)`。
- 应用、环境、发布版本、标准化路由、设备类型和匿名会话 ID。
- 批量、采样、失败重试、页面退出时 `sendBeacon`，不支持时使用 `fetch(..., keepalive: true)`。

默认不采集 Cookie、Authorization、Token、请求头、请求/响应正文、用户输入、完整 URL Query/Hash、邮箱、手机号、用户真实 ID、DOM 文本、截图和录屏。

推荐默认限制：单批最多 50 条或 64KiB、最长等待 5 秒、失败使用有限指数退避、页面连续失败时熔断。最终数值以技术验证为准。

### 7.2 ECS Telemetry Service

MVP 使用一个模块化 ECS 服务，内部包含 Ingest、Cleaner 和 Query 三个边界，暂不拆成多套微服务：

- `POST /v1/telemetry/batches` 接收 SDK 批量事件。
- 验证 SDK 版本、应用写入标识、Origin、Schema、事件数和载荷大小。
- 服务端生成接收时间，标准化路由，限制字段长度和属性数量。
- 删除或哈希禁止字段，拒绝无法安全清洗的事件。
- 生成 `event_id`、`ingest_id` 和审计结果，完成批次内去重。
- 输出一行一个 JSON 事件到 `stdout`，通过 ECS `awslogs` Driver 写入 CloudWatch Logs。
- 仅为低基数字段生成聚合指标；禁止把 session、event、request、原始 URL 或用户标识作为 CloudWatch 指标维度。

浏览器不持有 AWS Access Key。客户端使用可公开的应用写入标识；安全控制由 Origin 白名单、速率限制、配额、载荷校验和服务端数据策略共同完成。

### 7.3 查询服务

Query API 由服务端构造固定查询模板，不接受浏览器或模型传入任意 Logs Insights 查询语句：

- `GET /v1/performance/overview`
- `GET /v1/performance/pages`
- `GET /v1/logs/search`
- `GET /v1/logs/{eventId}`

统一支持 `appId`、`environment`、`release`、`route`、`from`、`to` 等受控过滤条件。查询使用 CloudWatch Logs Insights 的异步查询流程，并设置时间范围、扫描量、结果数、超时和并发上限；短时间重复查询允许服务端缓存。

### 7.4 可视化页面

MVP 页面包含：

- 应用、环境、发布版本、页面路由和时间范围过滤器。
- LCP、INP、CLS 的 p75 卡片及好/需改进/差状态。
- 性能时间趋势和最慢页面 Top N。
- JavaScript 错误数量、错误率和版本变化趋势。
- 清洗后日志列表，支持时间、级别、路由、版本和关键词筛选。
- 日志详情展示 Evidence ID、采集时间、接收时间、清洗标记和允许展示的属性。
- 加载、无数据、查询超时、权限不足和部分数据状态。

默认阈值为 LCP 2.5 秒、INP 200 毫秒、CLS 0.1，并以第 75 百分位判断；阈值必须可配置。

### 7.5 Agent 运维聊天

第一版使用一个只读诊断 Agent，通过 MCP 调用结构化工具：

- `query_page_performance`
- `list_slow_pages`
- `search_frontend_logs`
- `get_frontend_log_event`

工具参数只允许结构化过滤条件，MCP Server 负责 Scope、时间范围、结果上限和租户/项目校验。模型不能生成或执行任意 CloudWatch Logs Insights、Shell、SQL 或 AWS CLI 命令。

回答至少包含实际查询范围、关键指标和日志模式、Evidence 引用、数据不足说明和下一步只读检查建议。

## 8. 数据契约

公共事件头：`schema_version`、`event_id`、`event_type`、`occurred_at`、`received_at`、`app_id`、`environment`、`release`、`route_template`、`anonymous_session_id`、`sdk_name`、`sdk_version`。

事件类型：

- `web_vital`：metric、value、rating、navigation_type。
- `page_view`：route_template、navigation_type、duration_ms。
- `frontend_error`：error_type、message_fingerprint、stack_fingerprint、resource_type。
- `frontend_log`：level、message_template、approved_attributes。

原始错误信息和 Stack 必须在客户端基础截断，在 ECS 服务端再次脱敏；CloudWatch 中不保存原始凭据和禁止字段。

## 9. 安全、隐私与成本边界

- SDK 写入标识不是秘密，不能被当作身份认证凭据。
- 第一期采用单组织、多应用、多环境，但事件、API、Evidence、Agent 和 MCP 全链路保留服务端派生的 `tenantId`。
- Write Key 必须绑定 tenant/app/environment/Origin；客户端提交的 tenantId 不能作为授权来源。
- 管理和查询 API 必须经过服务端身份认证与 RBAC。
- 所有查询绑定应用和环境 Scope，并记录审计。
- ECS Task Role 使用最小 CloudWatch Logs/Query 权限，禁止通配管理员权限。
- CloudWatch Log Group 启用明确保留期；开发环境推荐先使用 7 天，正式值待确认。
- SDK 采样、单应用配额、批次大小、查询时间范围和扫描量必须有上限。
- 高基数字段只保存在日志中，不生成 CloudWatch Metric Dimension。
- 外部公开部署前必须完成 HTTPS、Origin 策略、限流、滥用测试和费用预算确认。

## 10. 非功能要求

- SDK 主包建议 gzip 后不超过 20KiB，最终门禁以构建产物测量。
- SDK 不能阻塞页面主线程，不因上报失败影响业务页面。
- 正常情况下，清洗后的事件应在 2 分钟内可查询；需要真实 AWS 环境验证。
- 页面查询默认不超过 24 小时，日志列表单次不超过 200 条。
- Agent 单轮最多 4 次 Telemetry MCP 调用，默认查询范围不超过 1 小时。
- 所有时间使用 UTC 存储，页面按用户时区显示。

## 11. 验收标准

- `AC-MVP-001`：示例页面接入 SDK 后可以采集 LCP、INP、CLS、页面事件、JS 错误和显式日志。
- `AC-MVP-002`：SDK 批量、采样、重试和熔断不会阻塞或破坏业务页面。
- `AC-MVP-003`：Cookie、Token、请求正文、完整 Query 和禁止字段不会进入 CloudWatch Logs。
- `AC-MVP-004`：ECS 服务可以验证、清洗、标准化、去重并输出版本化 JSON 事件。
- `AC-MVP-005`：用户可以按应用、环境、版本、路由和时间查看 p75 性能与错误趋势。
- `AC-MVP-006`：用户可以搜索清洗后的前端日志并打开证据详情。
- `AC-MVP-007`：Agent 可以通过只读 MCP 工具回答性能和日志问题，并返回实际范围与 Evidence。
- `AC-MVP-008`：模型不能提交任意 Logs Insights 查询或扩大查询 Scope。
- `AC-MVP-009`：SDK 不包含 AWS 凭据，API Key、Task Role 凭据和内部查询能力不暴露给浏览器。
- `AC-MVP-010`：本地 Mock 环境通过后，真实 AWS 验收必须另行获得成本与部署确认。

## 12. 成功指标

- SDK 有效批次接收率。
- Schema 拒绝、清洗、截断和限流数量。
- 页面性能事件与错误事件可查询延迟。
- Dashboard 查询成功率和 p95 完成时间。
- Agent 工具选择正确率、Evidence 引用完整率和人工采纳率。
- 每应用每日事件量、CloudWatch 写入量、查询扫描量和估算费用。

第一轮只建立基线，不在没有真实流量前承诺生产 SLA。

## 13. Feature 顺序

```text
Frontend Telemetry SDK
        -> AWS Telemetry Pipeline
              -> Performance Dashboard
              -> Ops Log Chat Agent
```

Dashboard 和 Agent 在数据管道稳定后可以分别开发，但由于都会修改第一版 Web/API 契约，默认顺序执行；确认写入范围隔离后才并行。

## 14. 开放问题

- 第一版 Web 框架、API 框架、包管理器与 Monorepo 方案最终确认。
- ECS 使用 Fargate 还是 EC2 Capacity Provider；MVP 推荐 Fargate，真实资源创建待确认。
- 接入入口使用 ALB 还是 API Gateway；MVP 推荐 ALB + ECS，成本与安全评审后确认。
- CloudWatch 开发环境保留期、日志量和费用上限。
- 是否在公开验证前增加 WAF、SQS 缓冲和 Dead Letter Queue。
- 用户身份源、应用写入标识签发方式与多租户 Scope。
- DeepSeek/Qwen 中哪一个作为 Agent 默认模型，以及工具调用回归基线。
- 图表组件和视觉规范。

## 15. 参考资料

- [Amazon ECS 使用 awslogs 发送日志到 CloudWatch](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/using_awslogs.html)
- [CloudWatch Embedded Metric Format](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Embedded_Metric_Format.html)
- [CloudWatch Logs Insights StartQuery](https://docs.aws.amazon.com/cli/latest/reference/logs/start-query.html)
- [Web Vitals](https://web.dev/articles/vitals)
