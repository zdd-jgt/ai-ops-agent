# 可观测性、拓扑与事件中心

## 默认可观测套件

客户没有现有监控系统时，第一期建议提供轻量默认套件：

| 能力 | 默认组件 |
|---|---|
| 统一采集 | OpenTelemetry Collector |
| 指标 | Prometheus |
| Kubernetes 状态 | kube-state-metrics |
| 主机指标 | node_exporter |
| 日志 | Loki |
| Trace | Tempo |
| 可视化 | Grafana |
| 告警 | Alertmanager |
| 故障事实 | AI Ops 内部事件中心 + PostgreSQL |

第一期优先使用适合小规模部署的单体模式，避免为了架构完整过早引入 Kafka 和大量微服务。规模扩大后，再根据每日写入量、查询并发、保留周期和可用性目标拆分。

## 外部系统接入入口

- OTLP gRPC/HTTP。
- Prometheus Scrape 和 Remote Write。
- Alertmanager/Webhook。
- Syslog 和文件日志。
- JMX、SNMP 和各类 Exporter。
- Sentry。
- Elasticsearch/OpenSearch。
- Zabbix、Nagios 等传统监控。
- CloudWatch、CloudTrail、AWS Config 和 AWS 安全服务。

## 拓扑的四个层次

### 资产拓扑

描述主机、虚拟机、容器、负载均衡、数据库、缓存、队列、对象存储和网络资源，以及配置历史。

### 服务目录

描述人类确认的业务结构：系统、服务、API、资源、负责人、重要程度、代码仓库、SOP 和声明式依赖。

### 运行时拓扑

从 Trace、调用指标、Kubernetes、网络和中间件连接中推导故障发生时实际存在的依赖关系。

### 变更时间线

记录 Git、CI/CD、镜像、Deployment、配置中心、数据库变更、AWS Config 和 CloudTrail 操作。

根因分析时按事件时间窗口把四层拓扑合并，而不是长期维护一张绝对正确的静态关系图。

## 统一资源身份

建议至少规范：

```text
tenant_id
deployment_id
schema_version
source_system
source_event_id
service.namespace
service.name
service.instance.id
service.version
deployment.environment.name
cluster
namespace
resource_id
owner_team
criticality
```

第一期可使用 PostgreSQL 保存节点、关系和有效时间；只有在大量多跳图查询成为明确瓶颈后再考虑图数据库。

## 内部事件中心定义

事件中心把多个原始信号聚合为一个可跟踪的故障事实。例如，Prometheus 告警、Sentry 异常和日志错误可以被关联为同一个“订单服务数据库连接耗尽”事件。

飞书和企业微信不是事件中心。它们只显示事件卡片、接收人工操作并回传状态。

## 事件核心字段

- 事件 ID、标题、状态和严重级别。
- 开始、发现、确认、恢复和关闭时间。
- 受影响服务、资源和环境。
- 告警指纹和原始信号引用。
- 影响范围和业务重要程度。
- 最近发布、配置和人工操作。
- 根因候选、证据、置信度和反证。
- 处理建议、负责人和审批记录。
- 外部通知渠道及消息 ID。
- 恢复验证、最终根因和复盘链接。

## 事件生命周期

```text
OPEN
  -> ACKNOWLEDGED
  -> INVESTIGATING
  -> MITIGATING
  -> RECOVERED
  -> CLOSED
```

同时支持误报、重复事件、合并、重新打开和升级等状态操作。

事件、告警、异常、工单和证据的统一定义、幂等与关联规则见 [领域模型与术语](domain-model-and-glossary.md)。

## 参考资料

- [OpenTelemetry Kubernetes Collector](https://opentelemetry.io/docs/collector/install/kubernetes/)
- [OpenTelemetry 服务语义规范](https://opentelemetry.io/docs/specs/semconv/resource/service/)
- [AWS Config 工作原理](https://docs.aws.amazon.com/config/latest/developerguide/how-does-config-work.html)
- [Backstage 软件目录](https://backstage.io/docs/features/software-catalog/)
- [Grafana Tempo 架构](https://grafana.com/docs/tempo/latest/introduction/architecture/)
- [Grafana Loki](https://grafana.com/docs/loki/latest/)
