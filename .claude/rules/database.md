---
description: PostgreSQL 数据库规范，涵盖命名、迁移、查询与数据保留
globs: packages/event-center/**, apps/**, migrations/**
---

# 数据库规范

> 项目使用 PostgreSQL 作为事件中心和结构化状态存储。ORM/迁移工具待脚手架阶段确定（推荐 Drizzle 或 Prisma）。

## 命名规范

- **表名**: snake_case 复数。`incidents`、`alerts`、`diagnosis_hypotheses`
- **列名**: snake_case。`created_at`、`incident_id`、`severity_level`
- **主键**: 单列 `id`，使用 UUID v7 或 ULID（时间排序 + 唯一性）
- **外键**: `<referenced_table_singular>_id`。`service_id` 引用 `services.id`
- **索引**: `idx_<table>_<column(s)>`。`idx_incidents_tenant_status`
- **唯一约束**: `uq_<table>_<column(s)>`。`uq_alerts_fingerprint`
- **迁移文件**: `<YYYYMMDDHHMMSS>_<简短描述>.sql` 或 ORM 生成的等价格式

## 表设计

- 所有表必须包含:
  - `id` — 主键
  - `created_at` — `TIMESTAMPTZ NOT NULL DEFAULT now()`
  - `updated_at` — `TIMESTAMPTZ NOT NULL DEFAULT now()`
- 多租户场景下所有表包含 `tenant_id`，所有查询必须包含租户过滤
- 软删除场景使用 `deleted_at TIMESTAMPTZ`，不建议物理删除事件数据
- JSONB 列用于半结构化数据（如事件信封），但必须定义顶层键文档
- TEXT 列仅用于自由文本（如通知内容），避免用于可枚举字段

## 迁移

- 所有 schema 变更通过迁移文件管理，禁止手动修改数据库
- 迁移必须可回滚（提供 `down` 迁移或在 PR 中注明回滚方案）
- 每个迁移在 CI 中执行 `up` + `down` + `up` 验证
- 生产迁移前在 staging 环境执行并验证
- 迁移不得包含数据擦除操作，除非经过审批

## 查询规范

- 使用参数化查询或 ORM 安全方法，禁止字符串拼接 SQL
- 所有查询必须包含 `WHERE tenant_id = $1` 或等价租户过滤
- 时间范围查询必须设置上限（如最大 30 天窗口）
- 列表查询必须分页（基于游标，不用 offset）
- 禁止 `SELECT *`，显式列出所需列
- JOIN 不超过 3 层，复杂查询拆分为多次查询或在应用层聚合
- 查询超时: OLTP 5 秒，分析查询 30 秒

## 数据保留

| 数据类型 | 推荐策略 |
|----------|----------|
| 事件 + 告警 | 热存储 90 天，之后归档或降采样 |
| 诊断记录 + 证据引用 | 完整保留 1 年 |
| 审计日志 | 完整保留 1 年，之后归档 |
| 通知记录 | 90 天 |
| Workflow Snapshot | 30 天 |

- 归档数据保存在对象存储（S3/MinIO），支持按需恢复查询
- 备份: 每日全量 + WAL 归档，RPO ≤ 15 分钟
- 每季度执行一次完整备份恢复演练

## 性能

- 高频过滤列（`tenant_id`、`status`、`created_at`、`severity`）建立索引
- JSONB 列的高频查询键建立 GIN 索引
- 事件中心写入路径使用批量 INSERT，单次不超过 500 行
- 归档和清理操作在低峰期执行，使用分批删除避免长事务
