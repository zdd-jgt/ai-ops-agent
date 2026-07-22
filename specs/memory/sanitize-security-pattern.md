---
title: 客户端脱敏安全模式 — 禁止字段检测 + 白名单 + 截断
feature: frontend-telemetry-sdk-feature
type: reusable
tags: [security, sanitize, pii, telemetry, frontend]
date: 2026-07-20
---

**问题/场景**：前端 SDK 采集错误和日志时，可能意外包含 Token、Cookie、Authorization Header 等敏感数据。需在客户端双重防护。

**解法/结论**：
1. 结构层面：`sanitizeUrl()` 使用 URL API 剥离 Query/Hash 只保留 origin+pathname
2. 正则检测：`FORBIDDEN_PATTERNS` 数组包含 Bearer Token、key=value 模式匹配，检测失败直接丢弃该属性
3. 白名单过滤：接入方可配置 `allowedKeys: Set<string>`，只允许指定属性 key 通过
4. 值类型过滤：禁止 function/symbol/bigint 类型，对象值通过 JSON.stringify 验证可序列化
5. 长度截断：所有字符串值有硬上限，静默截断不抛异常
6. 所有脱敏路径包裹 try-catch，不向业务页面抛出任何异常

**复用方式**：后端 API 的入站数据清洗层可直接复用 `FORBIDDEN_PATTERNS` 正则列表和 `sanitizeUrl()` 逻辑。MCP 工具输出处理可参考此模式——将工具输出按不可信数据处理并与系统指令隔离。
