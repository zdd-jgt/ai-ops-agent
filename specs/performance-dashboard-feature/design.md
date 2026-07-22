# Performance Dashboard Feature Design

## 页面结构

```text
Global Filters
|- Web Vitals Cards
|- Performance Trend
|- Slow Pages Table
|- Error Trend
`- Frontend Logs Table -> Evidence Drawer/Page
```

## 模块边界

- `apps/web/src/features/observability/api`：Query API Client 与运行时 Schema 校验。
- `.../filters`：URL 可分享的受控过滤状态。
- `.../performance`：Vitals、趋势和慢页面。
- `.../logs`：搜索、列表和 Evidence 详情。

## 数据契约

- Overview 返回 time range、filters、sample count、p75 和 threshold status。
- Pages 返回标准化 route、样本数、各指标 p75 和错误数。
- Log Search 返回受限字段和游标；详情按 Evidence ID 获取。
- 每个响应包含 `query_status`、`generated_at` 和实际查询范围。

## 状态处理

- 过滤变化取消或忽略旧请求。
- `pending/partial/timeout/rate_limited/forbidden` 使用不同非颜色提示。
- 样本不足时展示“不足以判断”，不显示误导性好/差结论。

## 安全

- 浏览器不保存 AWS 凭据和 CloudWatch 查询文本。
- 日志详情只渲染允许字段，文本转义，不把日志内容当 HTML。
- URL 中不放密钥、原始日志或用户标识。

## 技术假设

- 推荐 React + TypeScript，但在脚手架任务前确认。
- 图表组件必须支持空数据、可访问标签和测试稳定性。
