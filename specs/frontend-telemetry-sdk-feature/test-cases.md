# Frontend Telemetry SDK Feature Test Cases

| ID | AC | 类型 | 优先级 | 前置/Mock | 执行与预期 | 证据 |
|---|---|---|---|---|---|---|
| TC-SDK-001 | AC-SDK-001 | 组件/浏览器 | P0 | Mock PerformanceObserver、error、unhandledrejection | 触发各类事件后得到正确事件类型与字段 | 测试输出与事件快照 |
| TC-SDK-002 | AC-SDK-002 | 契约 | P0 | 固定合法/非法夹具 | 合法事件通过，缺字段、错版本和超限事件失败 | Schema 测试报告 |
| TC-SDK-003 | AC-SDK-003 | 单元 | P0 | Fake timer、Mock Transport | 达到数量/大小/时间触发批量；采样、退避、熔断符合配置 | 聚焦测试报告 |
| TC-SDK-004 | AC-SDK-004 | 安全 | P0 | 含 Token、Cookie、Query、邮箱和深层对象的输入 | 发送载荷无禁止字段，超限内容被截断或拒绝 | 脱敏断言 |
| TC-SDK-005 | AC-SDK-005 | 韧性 | P0 | Transport 抛错、429、5xx、离线 | 页面代码继续运行，无无限重试和未处理异常 | 错误注入报告 |
| TC-SDK-006 | AC-SDK-006 | 构建 | P1 | 生产构建 | 记录 gzip 大小且不超过门禁；超限时失败 | 构建产物清单 |

当前执行命令：`pnpm test`。测试框架：Vitest 4.x。24/24 测试全部通过。
