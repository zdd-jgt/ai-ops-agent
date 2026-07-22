---
title: /yd:ai 流程强制执行规则
feature: global
type: decision
tags: [yd-ai, workflow, enforcement, n1-n8]
date: 2026-07-21
---

**问题/场景**：多次出现 /yd:ai 执行时跳过 N4(Review)、N5(Memory)、N6(QA)、N7(Context)、N8(Finish) 节点，直接输出非正式总结就结束。

**解法/结论**：
/ yd:ai 的 8 个节点 N1→N8 是强制流程，不可跳过任何一个节点。

执行约束：
- 每个节点执行前必须读取 `~/.claude/commands/yd-ai-nodes/` 下对应文件
- 每个节点完成后输出确认行：`✓ [节点名] 完成，进入 [下一节点名]`
- N4 Codex Review 是强制步骤，所有任务执行完毕后必须调用 yd-code-reviewer
- N5 Memory 写入是强制步骤，必须写入 at least 一条经验
- N6 QA 评估是强制步骤，必须逐条核验 AC
- 未完成当前节点前，不得进入下一节点
- 禁止在任何节点未完成时输出"总结"或"完成"字样

**复用方式**：所有 Feature 执行 /yd:ai 时必须遵守此规则。每次违规应在下次执行前提醒。
