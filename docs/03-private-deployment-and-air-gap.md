# 私有化与完全断网部署

## 本地版运行 Profile

### Private Connected

- 系统部署在客户内网。
- 出网必须经过代理、域名白名单和审计。
- 可选访问飞书、企业微信或云端模型。
- 原始遥测数据仍默认保留在客户环境。

### Air-Gapped

- 安装和运行期间完全不访问公网。
- 使用本地模型、本地知识库、本地对象存储和本地事件中心。
- 启动前检查当前宿主机或全部推理节点；低于所选模型最低配置时阻止本地模型和 Agent Runtime 启动。
- 不依赖公网 DNS、NTP、镜像仓库、字体、许可证服务或遥测上报。
- 飞书和公网企业微信连接器禁用，改用内部控制台、内网邮件、短信网关或客户内部 IM。

## 离线交付物

- 全部 OCI 镜像及离线镜像仓库导入包。
- Helm Charts、Kubernetes 清单和配置模板。
- 大语言模型、Embedding 和 Reranker 权重。
- 必需的软件包、插件和前端静态资源。
- SBOM、开源许可证和第三方组件清单。
- 文件签名、哈希校验和安装前检查工具。
- 默认规则、Dashboard、告警模板和运维手册。
- 离线授权文件或不依赖在线校验的授权机制。
- 增量升级包、数据库迁移和回滚方案。
- 离线漏洞库、规则库和知识库更新包。

## 完全断网验证清单

- 资源不足、GPU/驱动不兼容、权重缺失或哈希错误时预检失败，模型与 Agent Runtime 均未启动。
- 阻断全部公网路由后完成安装。
- 阻断全部公网路由后完成启动、重启和故障恢复。
- 页面不请求公网 JavaScript、字体、图片或 CDN。
- 模型服务不下载权重、不请求外部 API。
- 本地模型启动失败时不回退到 DeepSeek、Qwen、Bedrock 或其他云端 Provider。
- 镜像不存在隐式在线拉取。
- 许可证不会因无法联网导致核心功能停止。
- 所有外发请求都有显式配置和审计记录。
- 离线升级失败时可以恢复上一个版本。

## 多环境采集方案

### Kubernetes

- 节点级 OpenTelemetry Collector DaemonSet。
- 集群级 Collector Gateway Deployment。
- kube-state-metrics 和节点指标采集。
- 应用通过 OTLP 或自动插桩发送 Trace、指标和日志。
- Kubernetes 事件、Deployment、Pod、Node 和 Service 关系进入拓扑服务。

### 虚拟机和物理机

- OpenTelemetry Collector 作为系统服务运行。
- node_exporter 或兼容主机指标采集器。
- 文件日志和 Syslog 接入。
- 进程、端口、主机、网络和部署环境元数据标准化。

### 传统服务

- Java JMX。
- SNMP。
- Prometheus Exporter。
- Syslog 和文件日志。
- 数据库、中间件和负载均衡器专用适配器。
- 无法安装 Agent 的设备通过网关或远程拉取接入。

## 网络原则

- 采集端主动连接中央 Gateway，减少被监控环境的入站端口。
- 传输使用 TLS/mTLS。
- 按环境、租户和数据级别隔离管道。
- 私有化联网模式的公网出口必须集中经过代理。
- Air-Gapped Profile 默认拒绝所有公网出口。
