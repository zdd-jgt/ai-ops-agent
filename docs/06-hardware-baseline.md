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

日志存储初步估算：

```text
容量 = 每日写入量 × 保留天数 × 副本数 × 索引及压缩系数
```

模型显存必须通过实际模型和真实运维评测集压测，不凭参数量直接承诺并发能力。

## 参考资料

- [K3s 硬件要求](https://docs.k3s.io/installation/requirements)
- [vLLM GPU 支持要求](https://docs.vllm.ai/en/v0.22.0/getting_started/installation/gpu/)

