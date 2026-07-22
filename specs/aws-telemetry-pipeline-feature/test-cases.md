# AWS Telemetry Pipeline Feature Test Cases

| ID | AC | 类型 | 优先级 | 前置/Mock | 执行与预期 | 证据 |
|---|---|---|---|---|---|---|
| TC-PIPE-001 | AC-PIPE-001 | API/契约 | P0 | 合法、错 Key、错 Origin、超限批次 | 合法请求接收，非法请求返回稳定 4xx/429 | API 测试报告 |
| TC-PIPE-002 | AC-PIPE-002 | 安全 | P0 | 含凭据、PII、深层对象和超长 Stack | Sink 中无禁止字段，无法清洗事件被拒绝 | 泄漏扫描结果 |
| TC-PIPE-003 | AC-PIPE-003 | 组件 | P0 | 重复和乱序事件 | 输出单行版本化 JSON，批次内去重且时间标准化 | Sink 快照 |
| TC-PIPE-004 | AC-PIPE-004 | API | P0 | Mock Logs Insights | 固定查询模板正确处理过滤器、pending、complete、partial、timeout | Adapter 测试 |
| TC-PIPE-005 | AC-PIPE-005 | 安全/权限 | P0 | 任意查询、跨应用、超时段输入 | 全部被确定性拒绝并审计 | 拒绝测试报告 |
| TC-PIPE-006 | AC-PIPE-006 | 集成 | P0 | Local Sink、Docker Mock | SDK 到清洗事件再到 Query Fixture 完整可运行 | 本地集成证据 |
| TC-PIPE-007 | AC-PIPE-007 | AWS 集成 | P0 | 已批准的 AWS 开发环境 | ECS 接收后 2 分钟目标内可由 Query API 查询 | CloudWatch/ECS 脱敏证据 |

当前执行命令：`not_configured`。TC-PIPE-007 在外部批准前不得执行。
