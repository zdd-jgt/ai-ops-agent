---
description: React + TypeScript 前端规范，涵盖组件、状态管理、路由与可观测性
globs: apps/web/**
---

# 前端规范

> 基于 `specs/performance-dashboard-feature/design.md` 和 `specs/ops-log-chat-feature/design.md` 提取。前端技术栈: React + TypeScript。

## 组件规范

- 每个组件一个文件，文件名与组件名一致（PascalCase）
- 使用函数组件 + Hooks，避免 class 组件
- 组件按功能域组织: `features/<domain>/`（如 `features/observability/`、`features/ops-chat/`）
- 共享 UI 组件放在 `components/ui/`
- 组件 props 使用 `interface` 定义，导出供测试使用
- 图表组件必须支持空数据状态、可访问标签（`aria-label`）和加载/错误状态

## 状态管理

- 过滤状态: URL 可分享（`useSearchParams`），支持书签和链接分享
- 服务端数据: 推荐 React Query / TanStack Query，缓存策略显式定义
- 表单状态: React Hook Form + Zod Schema 校验
- 页面级状态不通用于其他路由，避免全局 Store 污染

## 路由

- 使用 React Router 或框架内置路由（Next.js 文件路由）
- 路由路径使用 kebab-case: `/performance`、`/ops-chat`、`/incidents/:id`
- 路由守卫: 不在前端做权限判断，依赖 API 返回的状态驱动 UI

## 数据加载与状态处理

- 每个数据展示组件必须处理四种状态:
  - `pending` — 骨架屏或加载指示器
  - `partial` — 部分数据可用时展示已获取内容并标注缺失
  - `timeout / rate_limited / forbidden` — 使用非颜色提示（图标 + 文字）
  - `empty / insufficient` — 样本不足时展示"不足以判断"，不显示误导性结论
- 过滤参数变化时取消或忽略旧请求（AbortController）
- 日志详情只渲染允许字段，文本转义，禁止将日志内容作为 HTML 插入（`dangerouslySetInnerHTML`）

## 安全

- 浏览器不得保存 AWS 凭据和 CloudWatch 查询文本
- URL 中不放密钥、原始日志或用户标识
- 所有 API 调用使用服务端返回的 `query_status` 和 `actual_filters` 展示，不信任前端拼接的查询条件
- CSP 策略禁止 inline script 和未授权外部资源

## 可观测性

- 使用项目自己的前端遥测 SDK（`specs/frontend-telemetry-sdk-feature/`）
- 关键用户交互（搜索、过滤、切换 Tab、展开 Evidence）记录遥测事件
- 前端错误统一上报到遥测接入服务，不裸抛到浏览器控制台
- Performance Dashboard 自身页面的 Web Vitals 也进入遥测管道

## 测试

- 关键路径组件至少一个渲染测试（React Testing Library）
- 过滤/分页/加载状态转换使用单元测试
- E2E 覆盖: Dashboard 加载 → 过滤 → 展开详情 完整链路
