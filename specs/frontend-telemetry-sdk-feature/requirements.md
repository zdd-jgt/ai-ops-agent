# Frontend Telemetry SDK Feature Requirements

## Feature 信息

- ID：F-001
- 状态：pending
- depends_on：none
- 来源：[MVP PRD](../../docs/phases/phase-1/mvp-prd.md)

## 目标

交付一个浏览器 TypeScript SDK 和版本化事件契约，采集页面性能、前端错误和显式日志，并安全批量发送到可配置的 Telemetry Endpoint。

## 非目标

- 不采集请求/响应正文、Cookie、Token、DOM 文本、截图或 Session Replay。
- 不自动代理全部 `console.*`。
- 不在 SDK 中包含 AWS 凭据或查询能力。

## 用户故事

- Web 开发者可以用最小配置初始化 SDK。
- 运维人员可以获得带应用、环境、版本和标准化路由的性能及错误事件。
- 平台管理员可以配置采样、允许日志级别和批次上限。

## 功能需求

- `REQ-SDK-001`：提供 `init`、`log`、`flush` 和 `shutdown` API。
- `REQ-SDK-002`：采集 LCP、INP、CLS、FCP、TTFB、页面加载和路由切换事件。
- `REQ-SDK-003`：采集 `window.error`、资源加载错误和 `unhandledrejection`。
- `REQ-SDK-004`：按版本化 Schema 生成 `web_vital`、`page_view`、`frontend_error`、`frontend_log`。
- `REQ-SDK-005`：支持采样、批量、大小/数量限制、有限重试、熔断和 `sendBeacon`/`keepalive` 传输。
- `REQ-SDK-006`：客户端删除完整 Query/Hash，截断错误和 Stack，并只允许批准属性。
- `REQ-SDK-007`：提供 Mock Transport 与示例页面，支持无 AWS 环境的确定性验证。

## 非功能需求

- SDK 失败不能影响业务页面。
- 主包 gzip 目标不超过 20KiB，最终以构建产物验证。
- 所有时间戳使用 UTC ISO-8601 或协议约定的 epoch 毫秒。
- 不记录或输出 API Key、Cookie、Authorization 和用户真实标识。

## 边界情况

- 浏览器不支持 PerformanceObserver、sendBeacon 或部分 Web Vitals API。
- 页面快速关闭、离线、Endpoint 超时、连续 4xx/5xx。
- 单页应用路由变化、动态参数路由和超长错误 Stack。
- SDK 重复初始化、重复事件和采样为 0/1 的边界。

## 验收标准

- `AC-SDK-001`：示例页面可产生 LCP、INP、CLS、页面、错误和显式日志事件，对应 `AC-MVP-001`。
- `AC-SDK-002`：所有事件符合版本化 Schema，包含应用、环境、发布和标准化路由。
- `AC-SDK-003`：批量、采样、重试、熔断和页面退出 Flush 行为可确定性测试，对应 `AC-MVP-002`。
- `AC-SDK-004`：禁止字段和完整 Query/Hash 不出现在发送载荷，对应 `AC-MVP-003`、`AC-MVP-009`。
- `AC-SDK-005`：Endpoint 不可用时页面功能不受影响，SDK 不无限重试。
- `AC-SDK-006`：构建输出记录 gzip 大小，超过目标时测试失败或阻塞发布。

## 依赖与开放问题

- 推荐使用 pnpm workspace、TypeScript 和 `web-vitals`，正式初始化前确认。
- 路由模板由接入方传入还是 SDK 提供规则化函数，设计阶段先同时支持显式值和回调。
- SDK 名称、npm 包名和发布方式待确认。
