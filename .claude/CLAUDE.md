# 智能运维大脑（AI Ops Agent）

面向 AWS 云上与完全离线私有化环境的企业级 AI Ops 平台。统一分析指标、日志、链路、告警、资源拓扑、变更记录和运维知识，提供异常聚合、辅助根因定位、事件跟踪及受控自动化运维能力。当前处于产品与架构设计阶段。

## 技术栈

- 语言: TypeScript（主）、Go / Python（辅助服务）
- 前端: React + TypeScript
- 后端: Node.js（API / MCP Server / Agent Runtime）
- Agent Runtime: Mastra（候选，待技术验证）
- 数据库: PostgreSQL（事件中心、结构化状态存储）
- 包管理: pnpm（Monorepo）
- 可观测: OpenTelemetry、Prometheus、Loki、Tempo、Grafana、Alertmanager
- 基础设施: Kubernetes（主）、Docker、Terraform（AWS 资源）
- 协议: MCP（stdio 开发 / Streamable HTTP 生产）、OTLP、REST

## 常用命令

> 项目尚未进入编码阶段，以下为规划中的命令。脚手架搭建完成后需更新本节。

- 安装依赖: `pnpm install`
- 开发运行（全服务）: `pnpm dev`
- 构建: `pnpm build`
- 测试（单元）: `pnpm test`
- 测试（E2E）: `pnpm test:e2e`
- Lint: `pnpm lint`
- 类型检查: `pnpm typecheck`
- 数据库迁移: `pnpm db:migrate`
- 数据库迁移回滚: `pnpm db:rollback`

## 目录结构

```
apps/
├── web/                    # React 前端（监控面板、运维聊天、性能看板）
├── telemetry-api/          # 遥测接入服务（Ingest / Query / Policy）
├── mcp-server/             # 本地 MCP Server（受控诊断工具）
└── agent-runtime/          # Mastra Workflow + Agent 编排
packages/
├── model-gateway/          # 可插拔模型网关（Provider 插件机制）
├── event-center/           # 内部事件中心服务
├── context-service/        # 服务目录、拓扑、变更上下文
├── shared-schemas/         # 共享 Zod/TypeScript Schema
└── mcp-protocol/           # MCP 协议类型与工具定义
infra/
├── aws/                    # AWS 部署配置（Terraform）
├── kubernetes/             # K8s 部署清单
└── docker/                 # Docker 镜像定义
docs/                       # 架构与阶段文档
specs/                      # Feature Spec（requirements / design / tasks）
```

## 规则

@rules/coding-style.md
@rules/testing.md
@rules/security.md
@rules/git-workflow.md
@rules/frontend.md
@rules/backend-api.md
@rules/database.md
