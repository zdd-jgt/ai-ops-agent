---
title: React 监控面板组件模式 — Filter → Query Client → States → Charts
feature: performance-dashboard-feature
type: reusable
tags: [react, dashboard, observability, recharts, async, filter, accessibility]
date: 2026-07-21
---

**问题/场景**：构建面向运维人员的可观测性监控面板，需要处理过滤状态、异步查询、多状态 UI 和可访问性。

**解法/结论**：
1. 过滤状态使用 URL Search Params（`useSearchParams`），支持书签和链接分享，过滤变化自动取消旧请求
2. Query Client 层薄封装 fetch，所有查询参数结构化（不接受 raw query string），错误类型化（QueryApiError → RateLimitError / ForbiddenError）
3. 异步状态统一管理：`useAsyncQuery` hook 封装 AbortController + 请求序号竞态保护，映射 7 种状态（idle/pending/complete/partial/timeout/error/forbidden）
4. 状态指示器可访问：每种状态同时用图标 + 文字 + aria-label，颜色不是唯一区分方式
5. EvidenceDetail 白名单渲染：`ALLOWED_FIELDS` Set 控制可展示字段，新增 API 字段自动拒绝，禁止 dangerouslySetInnerHTML
6. 组件按功能域分目录（api/filters/performance/logs/states），每个目录 barrel export

**复用方式**：ops-log-chat-feature (F-004) 可复用 api/client、filters/useFilters、states/ 全部模块，只需新增 chat 相关组件。
