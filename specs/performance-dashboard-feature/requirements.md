# Performance Dashboard Feature Requirements

## Feature 信息

- ID：F-003
- 状态：pending
- depends_on：F-002 local/query contract complete

## 目标

提供一个最小 Web 页面，用统一过滤条件查看页面性能、错误趋势和清洗后的前端日志，并能够打开 Evidence 详情。

## 非目标

- 不做自定义 Dashboard Builder、告警配置、Session Replay 和完整设计系统。
- 不允许浏览器直接调用 CloudWatch。

## 功能需求

- `REQ-DASH-001`：提供应用、环境、发布、路由和时间范围过滤器。
- `REQ-DASH-002`：展示 LCP、INP、CLS p75 卡片、阈值状态和样本数。
- `REQ-DASH-003`：展示性能趋势、慢页面 Top N、错误数量/错误率和版本趋势。
- `REQ-DASH-004`：提供日志列表、筛选、分页/限制和 Evidence 详情。
- `REQ-DASH-005`：正确处理加载、无数据、部分数据、超时、限流和权限不足状态。
- `REQ-DASH-006`：所有请求只调用受控 Query API，并保留实际过滤范围。

## 非功能需求

- 默认查询范围 1 小时，最大 24 小时。
- 颜色不是唯一状态表达方式。
- 页面按用户时区显示，API 时间保持 UTC。
- UI 自动化与视觉证据在测试工具确定后执行。

## 验收标准

- `AC-DASH-001`：过滤条件可组合并映射为受控 Query API 参数。
- `AC-DASH-002`：LCP、INP、CLS 按 p75、样本数和配置阈值正确展示，对应 `AC-MVP-005`。
- `AC-DASH-003`：趋势、慢页面和错误统计与 API Fixture 一致。
- `AC-DASH-004`：日志搜索和 Evidence 详情可用，对应 `AC-MVP-006`。
- `AC-DASH-005`：所有异步和错误状态有明确反馈，旧请求不会覆盖新筛选结果。
- `AC-DASH-006`：页面源码与网络请求不包含 AWS 凭据或任意查询文本。

## 依赖与开放问题

- Web 框架、图表库、组件库和视觉规范待确认；计划路径暂用 `apps/web`。
- 第一版认证可使用开发身份替身，真实 AWS 查询前必须接入服务端身份。
