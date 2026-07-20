# 硬件基线

## 当前开发电脑

已读取的非敏感配置：

| 项目 | 配置 |
|---|---|
| 机型 | Intel MacBook Pro |
| CPU | 2.3GHz Intel Core i7，4 核/8 线程 |
| 内存 | 16GB |
| GPU | Intel Iris Plus，约 1.5GB 动态显存 |
| 架构 | x86_64 |
| 磁盘 | 约 466GiB，总可用空间约 205GiB |
| 系统 | macOS 15.7.4 |

机器序列号、硬件 UUID 等敏感标识不写入项目文档。

## 当前电脑适用范围

- 可以开发 Web、API、Agent 编排、事件中心和适配器。
- 可以运行小规模 PostgreSQL、Redis、Prometheus 和 Grafana。
- 可以进行少量 Loki/Tempo 数据的功能演示。
- 可以使用模拟模型或 CPU 运行极小量化模型。
- 不适合作为包含本地生产级大模型的私有化最低交付标准。
- 不适合多用户并发推理、完整监控栈压力测试或生产高可用验证。

## 开发者最低建议

- 8 核 CPU。
- 32GB 内存。
- 512GB SSD，至少保留 200GB。
- Apple Silicon 可用 MLX/llama.cpp 做本地演示。
- x86 Linux 如需本地推理，建议增加 12GB～16GB NVIDIA 显存。
- 单节点 K3s 或等价开发 Kubernetes。

当前 Intel Mac 可以作为 Lite 开发环境继续使用，但开发时应支持关闭本地大模型、缩短数据保留周期和使用模拟遥测数据。

在云上开发 Profile 中，该电脑可以通过模型网关调用 DeepSeek API、Qwen API 或其他已注册 Provider，因此不需要在本机启动主推理模型。API 不可用时应明确报错或使用显式启用的 Mock Provider，不能静默切换到未知模型。

## 私有化离线 POC 最低建议

| 资源 | 建议基线 |
|---|---|
| 操作系统 | Ubuntu 22.04/24.04 或企业 Linux |
| CPU | 16 核 x86_64 |
| 内存 | 64GB |
| GPU | NVIDIA 24GB 显存 |
| 磁盘 | 1TB NVMe SSD |
| Kubernetes | 单节点 K3s |
| 模型目标 | 7B～14B 量化模型、低并发 |

该配置用于 POC 和小规模非高可用环境，不等于生产 SLA。

## Air-Gapped 启动预检

离线模式在启动任何本地模型服务和 Agent Runtime 前必须执行主机预检。默认 `14b-q4` 级别 POC 基线为：

| 检查项 | 最低值 | 不满足时行为 |
|---|---|---|
| 操作系统 | 支持清单内的 x86_64 Linux | 阻止启动 |
| CPU | 16 核 | 阻止启动 |
| 内存 | 64GB | 阻止启动 |
| GPU | 受支持的 NVIDIA GPU | 阻止启动 |
| GPU 显存 | 24GB | 阻止启动 |
| 安装盘 | 1TB NVMe SSD | 阻止启动 |
| 可用空间 | 由离线包和模型清单计算，且保留运行安全余量 | 阻止启动 |
| GPU 驱动/推理运行时 | 与离线兼容矩阵匹配 | 阻止启动 |
| 模型权重 | 文件完整、哈希匹配且版本受支持 | 阻止启动 |

上述数值是当前 POC 默认门禁，不代表所有模型都使用同一门槛。每个本地模型必须随离线包提供版本化规格清单，至少包含模型、量化、上下文、GPU 架构、最低显存、最低内存、磁盘需求、运行时版本和权重哈希。选择更大模型或更长上下文时，以模型清单中的更高要求为准。

预检报告示例：

```text
Air-Gapped preflight: FAILED
CPU cores       current=8       required>=16   FAIL
Memory          current=32GB    required>=64GB FAIL
GPU VRAM        current=none    required>=24GB FAIL
Result: local model and Agent Runtime were not started.
```

不得提供跳过生产预检的参数。当前 Intel Mac 执行该预检时应失败，这是预期行为；它仍可使用 `cloud-dev` 或显式 Mock Profile 开发非离线能力。

## 小规模生产建议

- 3 台平台节点，每台 8～16 核、32～64GB 内存、1TB NVMe。
- 2 台推理节点，每台至少一张 24GB GPU。
- 长上下文、更强模型或多人并发建议使用 48GB GPU。
- 监控存储、数据库、对象存储和模型推理应能独立扩容。
- 配置离线镜像仓库、独立备份和恢复验证。

## 容量计算变量

不能只按机器数量定规格，至少需要收集：

- Kubernetes 集群和节点数量。
- 服务、Pod、虚拟机和传统设备数量。
- 每秒指标样本数和标签基数。
- 每日日志与 Trace 写入量。
- 热数据和归档数据保留周期。
- 事件和并发用户数量。
- 模型参数量、量化方式和上下文长度。
- 模型并发、首 Token 延迟和目标吞吐。
- 模型规格清单、硬件预检报告和安全余量。

日志存储初步估算：

```text
容量 = 每日写入量 × 保留天数 × 副本数 × 索引及压缩系数
```

模型显存必须通过实际模型和真实运维评测集压测，不凭参数量直接承诺并发能力。

## 参考资料

- [K3s 硬件要求](https://docs.k3s.io/installation/requirements)
- [vLLM GPU 支持要求](https://docs.vllm.ai/en/v0.22.0/getting_started/installation/gpu/)
