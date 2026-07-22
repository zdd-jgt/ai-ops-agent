# Frontend Telemetry SDK Feature Design

## 架构

```text
Web App -> SDK Collectors -> Client Sanitizer -> Buffer -> Transport -> Telemetry Endpoint
                         \-> Mock Transport/Test Fixtures
```

## 计划模块

- `packages/telemetry-contracts`：事件 Schema、稳定错误码和测试夹具。
- `packages/web-telemetry-sdk`：配置、Collectors、Sanitizer、Buffer、Transport。
- `examples/sdk-demo`：最小接入和故障模拟页面。

## API 契约

```ts
initTelemetry({ appId, writeKey, endpoint, environment, release, routeResolver, sampleRate })
telemetry.log(level, message, approvedAttributes?)
telemetry.flush()
telemetry.shutdown()
```

`writeKey` 是公开写入标识而非秘密。传输使用 `POST /v1/telemetry/batches`，批次具有 `schema_version`、`sdk` 和 `events`。

## 数据与隐私

- URL 只保留 origin 之外的标准化 route template，不保留 Query 和 Hash。
- Error message、Stack 和 attributes 均设置长度、深度与数量上限。
- 默认属性白名单；对象值序列化失败时丢弃该属性而非阻塞页面。
- 匿名会话 ID 本地随机生成、短期轮换，不与真实用户 ID 绑定。

## 失败处理

- 4xx Schema/权限错误不重试；429 和有限 5xx 按服务端提示或退避重试。
- 缓冲达到上限时按配置丢弃低优先级事件并增加本地计数，不写控制台敏感信息。
- 不支持的浏览器能力跳过对应指标并产生受控 capability 状态。

## 技术决策

- 使用 `web-vitals` 获取稳定指标，直接 Web API 只用于补充能力。
- Transport 可替换，测试默认使用 Mock，不依赖 AWS。
- 契约包不依赖 UI、Mastra 或 AWS 类型。
- 当前只是计划路径；仓库脚手架由首个任务创建。
