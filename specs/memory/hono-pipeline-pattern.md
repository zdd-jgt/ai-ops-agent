---
title: Hono 后端管道模式 — Zod → RateLimit → Dedup → Normalize → Sink
feature: aws-telemetry-pipeline-feature
type: reusable
tags: [hono, backend, pipeline, ingest, zod, dedup, security]
date: 2026-07-21
---

**问题/场景**：遥测接入 API 需要多层处理管道（校验 → 限流 → 去重 → 标准化 → 持久化），每层独立且可测试。

**解法/结论**：
1. 使用 Hono + `@hono/zod-validator` 做请求级 Zod Schema 校验，复用 `packages/telemetry-contracts` 的共享 Schema
2. 管道模式：`RateLimit → Schema → Dedup → Normalize → Sanitize → Validate → Sink`
3. Sink 接口化（`Sink` interface），支持 `CompositeSink` 多路写入，一个 Sink 失败不影响其他
4. Query API 使用固定模板编译，不接受客户端传入的 raw query string，防注入
5. RateLimiter 开发阶段用内存 Token Bucket，生产换 Redis
6. 服务端二次 Sanitize（与客户端 F-001 形成双重防护），禁止字段检测正则与客户端保持一致

**复用方式**：任何新的后端 API 接入点（如 Webhook、K8s Event）复用相同管道模式。Sink 接口可用于切换到 Kafka/OpenSearch 等后端。
