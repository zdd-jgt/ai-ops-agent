---
description: 分支命名、Conventional Commits、PR 流程与文档同步要求
---

# Git 工作流

## Commit 规范

使用 **Conventional Commits** 格式:

```
<type>: <简短描述>

<详细说明（可选）>
```

### Type 定义

| Type | 用途 |
|------|------|
| `feat` | 新特性或功能 |
| `fix` | Bug 修复 |
| `docs` | 文档变更（README、架构文档、spec） |
| `design` | 架构设计、领域模型、安全模型等 |
| `chore` | 构建、依赖、CI 等非代码变更 |
| `refactor` | 重构，不改变功能 |
| `test` | 新增或修改测试 |
| `security` | 安全相关修复或加固 |

### 示例

```
feat: 添加 Prometheus Alertmanager Webhook 接入适配器
fix: 修复事件中心重复告警创建 Incident 的并发问题
security: 修复 MCP 工具参数注入绕过 Scope 检查
docs: 更新第一期安全威胁模型
design: 确定事件信封 schema_version 1.0.0 字段
```

## 分支命名

- `main` — 主分支，保持可演示状态
- `feature/<slug>` — 新功能开发
- `fix/<slug>` — Bug 修复
- `docs/<slug>` — 文档更新
- `design/<slug>` — 设计文档

## PR 流程

1. 从 `main` 创建 feature/fix 分支
2. 开发完成后提交 PR 到 `main`
3. PR 标题使用 Conventional Commits 格式
4. PR 描述: 变更摘要、关联 Issue/Spec、影响范围
5. 至少包含: 确定性单元测试通过、类型检查通过
6. 涉及模型/Agent 变更时附加 Golden Incidents 评估结果
7. 涉及安全相关变更时标注 `security` type 并触发安全评审
8. Squash merge 到 `main`

## 文档同步

- 代码架构变更时同步更新 `AGENTS.md` 和相关 `docs/` 文档
- 新增 MCP 工具或变更工具 Schema 时更新 `docs/phases/phase-1/local-mcp-server.md`
- Feature 开发前先在 `specs/<feature>/` 下完成 requirements → design → tasks
- 开放决策变更时更新 `docs/07-open-decisions.md`
