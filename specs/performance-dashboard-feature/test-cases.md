# Performance Dashboard Feature Test Cases

| ID | AC | 类型 | 优先级 | 前置/Mock | 执行与预期 | 证据 |
|---|---|---|---|---|---|---|
| TC-DASH-001 | AC-DASH-001 | 组件 | P0 | Query API Fixture | 组合过滤生成正确参数并保留在页面状态 | 组件测试 |
| TC-DASH-002 | AC-DASH-002 | 组件/边界 | P0 | 阈值上下界与样本不足 Fixture | p75、评级和样本数正确；不足时不评级 | 断言与截图 |
| TC-DASH-003 | AC-DASH-003 | 组件 | P0 | 趋势、慢页、错误 Fixture | 图表和表格与输入一致 | 组件测试 |
| TC-DASH-004 | AC-DASH-004 | E2E | P0 | 日志列表与详情 Fixture | 搜索、筛选、打开 Evidence 完整可用 | E2E 与截图 |
| TC-DASH-005 | AC-DASH-005 | 韧性/视觉 | P0 | pending、partial、timeout、429、403 | 每种状态有明确、可访问且不误导的反馈 | 状态截图 |
| TC-DASH-006 | AC-DASH-006 | 安全 | P0 | 恶意日志 HTML、网络请求检查 | 文本被转义；无 AWS 凭据和任意查询文本 | 安全测试 |

当前执行命令：`pnpm --filter @ai-ops/web test` 与 `pnpm --filter @ai-ops/web test:e2e`。本地系统 Chrome 已完成桌面/移动真实链路和视觉基线复验；自动化可访问性专项审计仍待补充。
