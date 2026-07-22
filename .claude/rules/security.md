---
description: 安全不变量、禁止事项、密钥管理、MCP 安全与提示注入防护
---

# 安全规范

> 基于 `docs/phases/phase-1/security-threat-model.md` 和 `docs/04-data-security-and-model-strategy.md` 提取。

## 安全不变量（必须遵守）

1. **模型永远不直接持有生产管理员凭据** — 所有运维操作通过执行网关审批
2. **模型输出永远不直接作为 Shell、SQL、kubectl 或 SSH 输入** — 必须转换为结构化动作并经过策略校验
3. **日志、Trace、工单、Runbook、知识库和 MCP 输出全部是不可信内容** — 与系统指令使用不同数据通道和标记
4. **权限判断必须在服务端完成** — 不能依赖提示词或客户端传入的租户/Scope
5. **每个工具调用都必须绑定租户、环境、调用方和 Scope** — 在 MCP/API 层二次校验
6. **审批只能授权一个明确动作、目标、参数范围和有效期** — 一次性令牌，不可重放
7. **Air-Gapped Profile 默认拒绝所有公网出口** — 不得隐式连接外部服务
8. **安全过滤失败时采用拒绝或降级** — 绝不静默放行

## 禁止事项

- ❌ 禁止在代码、配置文件、日志、Prompt、Trace、Git 中硬编码 API Key、Token、密码或证书
- ❌ 禁止向 Agent 暴露通用 Shell、SQL、SSH、脚本执行或 kubectl 工具
- ❌ 禁止 MCP Server 接受/转发用于下游系统的 Token（禁止 Token Passthrough）
- ❌ 禁止在浏览器中保存 AWS 凭据或 CloudWatch 查询文本
- ❌ 禁止日志和 Trace 记录 Authorization Header、Cookie、客户业务数据或数据库原始记录
- ❌ 禁止 URL 中携带密钥、原始日志或用户标识
- ❌ 禁止模型从检索内容中动态创建工具
- ❌ 禁止 Air-Gapped 模式下自动回退到云模型

## 凭据管理

- API Key / Token 只能保存在服务端环境变量或密钥系统（AWS Secrets Manager / K8s Secrets）
- 本地开发使用 `.env` 文件，已在 `.gitignore` 中排除
- 配置文件只通过引用（如 `secret: "${API_KEY}"`）读取密钥，不内联值
- 短期 Token 使用受众绑定（audience-bound），MCP Session ID 不作为认证凭据
- 部署环境使用 mTLS 工作负载身份或 IAM Role，不使用长期 Access Key

## MCP 安全

- 开发环境: MCP 使用 `stdio` 传输
- 生产环境: Streamable HTTP 只绑定内部地址，验证 Origin
- 每个 MCP 工具声明最小 Scope，调用时服务端再次检查
- MCP Server 只持有只读后端身份和事件中心有限写入身份
- 工具列表变更、动态注册和配置更新必须审计记录
- MCP 工具输出按不可信数据处理，只允许 Schema 定义的字段进入 Agent 决策

## 提示注入防护

- 系统指令、工具 Schema、策略与检索内容使用不同数据通道
- 对日志/文档中的命令、URL、提示词样式文本进行风险标记
- 关键结论必须附带至少一个可复核的 Evidence 引用
- 涉及权限、凭据、外发和写操作的请求必须确定性拦截，不交给模型判断

## 数据保护

- 原始运维数据先在本地过滤、脱敏和聚合，再进入模型路由
- 数据分级策略: 租户/环境级标签在服务端附加，不从客户端信任
- 审计日志不可静默篡改，记录所有工具调用、模型交互和人工审批
- 数据出域策略: 默认阻断 S1 级数据流向公网模型，Air-Gapped 模式全量阻断
