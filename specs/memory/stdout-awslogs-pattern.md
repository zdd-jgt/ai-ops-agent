---
title: ECS stdout → awslogs → CloudWatch 日志模式
feature: aws-telemetry-pipeline-feature
type: decision
tags: [aws, ecs, cloudwatch, logging, docker, infrastructure]
date: 2026-07-21
---

**问题/场景**：ECS Fargate 容器如何以最小代码量将结构化日志写入 CloudWatch Logs。

**解法/结论**：
1. 应用层：每行输出一条 JSON 到 stdout（不写文件、不调 AWS SDK）
2. ECS Task Definition 配置 `awslogs` log driver，自动收集 stdout → CloudWatch Logs
3. 应用代码零 AWS SDK 依赖，本地开发 `docker logs` 即可查看
4. 非生产环境双写（stdout + local file），方便本地调试
5. Log Group 和 Stream Prefix 在 Task Definition 中显式配置
6. Execution Role（写日志）和 Task Role（查日志）分离，最小权限

**复用方式**：所有 ECS 部署的服务（agent-runtime、mcp-server、event-center）统一使用 stdout JSON + awslogs 模式，不引入日志 Agent。
