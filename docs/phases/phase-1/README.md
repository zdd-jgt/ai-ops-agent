# 第一期：只读智能诊断闭环

## 目标

交付“遥测采集—清洗查询—证据收集—根因候选—处理建议”的只读闭环。第一期不执行生产写操作。

## 阅读顺序

1. [范围与验收](scope.md)
2. [最小 MVP PRD](mvp-prd.md)
3. [可观测性、拓扑与事件中心](observability-topology-and-event-center.md)
4. [本地 MCP Server 与 Agent 工具调用](local-mcp-server.md)
5. [领域模型与术语](domain-model-and-glossary.md)
6. [安全威胁模型](security-threat-model.md)
7. [非功能要求](non-functional-requirements.md)
8. [测试与评估计划](test-and-evaluation-plan.md)
9. [阶段 0 Agent Runtime 选型](../phase-0/agent-runtime-design.md)

## 当前实现状态（2026-07-22）

- SDK、Telemetry API、Dashboard、MCP/Agent/Chat 已有本地实现。
- Review 修复已覆盖：真实重试与 Beacon、SPA 路由、去重索引、Evidence Scope、MCP 入口、Scope/Budget、移除伪 Evidence、真实 Agent HTTP 调用。
- 认证基础已覆盖：单组织 tenantId、Write Key Registry、Bearer Principal、Query/Model/Agent RBAC、MCP tenant Scope 与最小子进程环境。
- 自动化结果：98 个测试、4 个桌面/移动 Chrome E2E、2 份视觉基线、全仓 TypeScript 静态检查和 Web 构建通过。
- 本地端到端冒烟已验证带认证的 Agent Runtime → MCP stdio → Telemetry Query API；零数据返回 `partial`。
- 尚缺：可访问性专项审计、真实模型评测、Air-Gapped 预检和 AWS 实际部署。

## 执行边界

- 只读诊断为主，不默认修改生产环境。
- Scope、时间范围与调用预算由 MCP Server 执行，不能依赖提示词。
- 模型 Provider 可插拔，但本地确定性诊断不要求 API Key。
- AWS/付费模型/生产操作仍需用户明确批准。
