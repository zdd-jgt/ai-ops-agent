---
title: Monorepo 脚手架模式 — pnpm workspace + TypeScript strict + Zod
feature: frontend-telemetry-sdk-feature
type: decision
tags: [monorepo, scaffold, pnpm, typescript, zod, telemetry]
date: 2026-07-20
---

**问题/场景**：项目从纯文档仓库进入编码阶段，需要建立 Monorepo 骨架和共享契约层。

**解法/结论**：
1. 使用 pnpm workspace（`pnpm-workspace.yaml`），目录分 `apps/`、`packages/`、`examples/`
2. 所有包 `type: "module"`，`tsconfig.base.json` 启用 `strict: true` + `isolatedModules` + `verbatimModuleSyntax`
3. 共享数据契约放在独立包（如 `packages/telemetry-contracts/`），使用 Zod 定义版本化 Schema，TypeScript 类型从 Schema 推导
4. 事件 Schema 采用 discriminated union（`z.discriminatedUnion("event_type", [...])`）实现类型安全的联合事件
5. 常量（长度限制、错误码）集中导出，避免各 consumer 重复定义导致不一致

**复用方式**：新 Feature 需要共享 Schema 时，在 `packages/` 下创建类似契约包。新 `apps/` 后端服务也遵循相同的 tsconfig 和 pnpm workspace 模式。
