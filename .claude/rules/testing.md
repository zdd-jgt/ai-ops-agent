---
description: 测试分层、文件命名、覆盖率要求与 Golden Incidents 评估规范
globs: apps/**, packages/**
---

# 测试规范

> 基于 `docs/phases/phase-1/test-and-evaluation-plan.md` 提取。测试框架待脚手架阶段确定（推荐 Vitest + Playwright）。

## 测试分层

| 层级 | 范围 | 框架 | 要求 |
|------|------|------|------|
| 确定性单元测试 | Schema 校验、指纹算法、状态机、脱敏规则、MCP 参数校验 | Vitest | 每次提交前通过 |
| 组件与契约测试 | 适配器、MCP Client/Server 兼容性、Provider 契约、迁移回滚 | Vitest | PR 合并前通过 |
| 场景与 Agent 评估 | Golden Incidents、工具选择正确性、证据引用、结果波动 | 评估框架 | 模型/提示变更后执行 |
| 安全与断网测试 | 提示注入、越权、密钥泄漏、Air-Gapped 启动 | 专项测试 | 安全评审前通过 |
| E2E 测试 | 完整诊断链路 | Playwright | 发布前通过 |
| 性能测试 | 告警突发、并发查询、存储容量 | k6 或等价工具 | 容量规划前执行 |

## 文件命名

- 单元测试: `*.test.ts`，与被测文件同目录
- 集成/契约测试: `*.spec.ts`，放在 `__tests__/` 或 `tests/` 下
- E2E: `e2e/*.e2e.ts`
- 测试辅助工具（fixtures、factories）: `test-utils/` 或 `__fixtures__/`

## 覆盖率

- 确定性逻辑（Schema、状态机、指纹、关联规则）: 目标 ≥ 90% 行覆盖
- 适配器层: 目标 ≥ 80% 行覆盖
- Workflow/Agent 编排层: 通过 Golden Incidents 覆盖，不强制行覆盖率
- 前端组件: 关键路径组件需至少一个渲染测试

## Golden Incidents

- 固定输入、固定期望的端到端 Agent 评估用例
- 至少包含: 单告警诊断、关联告警聚合、误报识别、跨服务级联故障
- 每次模型/提示/工具 Schema 变更后必须重新运行并对比结果
- 记录: 工具选择、参数范围、根因候选排序、证据引用数量和质量

## 模型 Provider 测试

- 新增 Provider 必须通过连通性、结构化输出、Tool Calling、超时和 Golden Incidents 五项测试
- 使用确定性输入验证各 Provider 输出的结构化字段一致性
- DeepSeek 和 Qwen 作为回归测试模型，每次变更后运行

## 断网测试

- Air-Gapped Profile 阻断公网后验证: 安装→启动→诊断→升级→恢复 全链路
- 云端 Provider 配置在 Air-Gapped 模式下必须导致启动失败，不得静默回退
- 每季度至少一次完整断网恢复演练
