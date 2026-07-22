import { useState } from "react";
import { VitalsCards, SlowPagesTable } from "./performance/index.js";
import { ErrorTrend, LogSearch } from "./log-explorer/index.js";
import { useFilters } from "./filters/useFilters.js";
import { ChatPage } from "../ops-chat/ChatPage.js";
import { useServiceHealth, type ServiceState } from "./health/useServiceHealth.js";

type WorkbenchView = "rca" | "alerts" | "healing";
type DrilldownView = "performance" | "logs";

const OPTIONAL_DATA_SOURCES = [
  { name: "Sentry", detail: "错误与堆栈", status: "offline", label: "未配置" },
  { name: "Prometheus", detail: "基础设施指标", status: "offline", label: "未配置" },
  { name: "Alertmanager", detail: "告警事件入口", status: "offline", label: "未配置" },
] as const;

export function DashboardPage() {
  const { filters, setFilter, createSignal } = useFilters();
  const serviceHealth = useServiceHealth();
  const [workbenchView, setWorkbenchView] = useState<WorkbenchView>("rca");
  const [drilldownView, setDrilldownView] = useState<DrilldownView>("performance");
  const dataSources = [
    { name: "Web Telemetry SDK", detail: "性能 / 错误 / 显式日志", status: "connected", label: "已接入" },
    sourceFromHealth("Telemetry API", "校验 / 脱敏 / 固定查询", serviceHealth.telemetryApi),
    sourceFromHealth("Agent Runtime", "诊断 Workflow / MCP", serviceHealth.agentRuntime),
    { name: "MCP Tools", detail: "4 个只读诊断工具", status: serviceHealth.agentRuntime === "online" ? "connected" : "standby", label: serviceHealth.agentRuntime === "online" ? "可调用" : "按需启动" },
    ...OPTIONAL_DATA_SOURCES,
  ];

  return (
    <div className="aiops-shell">
      <header className="aiops-header">
        <div className="aiops-brand">
          <span className="aiops-brand-mark" aria-hidden="true">AI</span>
          <div><p className="aiops-eyebrow">AIOPS COMMAND CENTER</p><h1>智能运维大脑</h1></div>
        </div>
        <div className="aiops-header-status" aria-label="系统当前状态">
          <div className="aiops-health"><span className="aiops-status-dot standby" /><div><small>系统综合健康度</small><strong>待计算</strong></div></div>
          <div className="aiops-incident-ticker"><span>INCIDENT</span>暂无已确认事件；证据不足时不输出健康结论</div>
          <div className="aiops-agent-heartbeat"><span className={serviceHealth.agentRuntime === "online" ? "aiops-pulse" : "aiops-status-dot standby"} /><div><strong>{serviceHealth.agentRuntime === "online" ? "Agent 在线" : "Agent 待命"}</strong><small>只读诊断模式</small></div></div>
        </div>
      </header>

      <div className="aiops-layout">
        <aside className="aiops-telemetry-panel" aria-label="监控与数据源">
          <SectionHeading eyebrow="TELEMETRY" title="诊断证据库" />
          <div className="aiops-source-list">
            {dataSources.map((source) => (
              <article className="aiops-source-card" key={source.name}>
                <span className={`aiops-status-dot ${source.status}`} />
                <div><strong>{source.name}</strong><small>{source.detail}</small></div>
                <span className={`aiops-source-state ${source.status}`}>{source.label}</span>
              </article>
            ))}
          </div>
          <div className="aiops-filter-card">
            <p className="aiops-card-label">诊断范围</p>
            <label>应用<input value={filters.appId} onChange={(event) => setFilter("appId", event.target.value)} /></label>
            <label>环境<input value={filters.environment} onChange={(event) => setFilter("environment", event.target.value)} /></label>
            <label>版本<input value={filters.release} placeholder="全部版本" onChange={(event) => setFilter("release", event.target.value)} /></label>
            <label>路由<input value={filters.route} placeholder="全部路由" onChange={(event) => setFilter("route", event.target.value)} /></label>
            <label>时间范围
              <select value={filters.timeRange} onChange={(event) => setFilter("timeRange", event.target.value)}>
                <option value="1h">最近 1 小时</option><option value="6h">最近 6 小时</option><option value="24h">最近 24 小时</option>
              </select>
            </label>
          </div>
        </aside>

        <main className="aiops-workbench">
          <div className="aiops-workbench-header"><SectionHeading eyebrow="WORKBENCH" title="智能诊断与治理" /><span className="aiops-readonly-badge">READ ONLY</span></div>
          <nav className="aiops-tabs" aria-label="诊断视图">
            <TabButton active={workbenchView === "rca"} onClick={() => setWorkbenchView("rca")}>关联事件与根因</TabButton>
            <TabButton active={workbenchView === "alerts"} onClick={() => setWorkbenchView("alerts")}>告警智能聚合</TabButton>
            <TabButton active={workbenchView === "healing"} onClick={() => setWorkbenchView("healing")}>优化与自愈建议</TabButton>
          </nav>
          <section className="aiops-core-view">
            {workbenchView === "rca" && <RcaView />}{workbenchView === "alerts" && <AlertsView />}{workbenchView === "healing" && <HealingView />}
          </section>

          <section className="aiops-drilldown">
            <div className="aiops-drilldown-header">
              <div><p className="aiops-eyebrow">EVIDENCE DRILLDOWN</p><h2>实时证据下钻</h2></div>
              <div className="aiops-segmented">
                <button className={drilldownView === "performance" ? "active" : ""} onClick={() => setDrilldownView("performance")}>性能指标</button>
                <button className={drilldownView === "logs" ? "active" : ""} onClick={() => setDrilldownView("logs")}>错误与日志</button>
              </div>
            </div>
            <div className="aiops-drilldown-content">
              {drilldownView === "performance" ? <div className="aiops-performance-grid"><VitalsCards filters={filters} createSignal={createSignal} /><SlowPagesTable filters={filters} createSignal={createSignal} limit={5} /></div> : <div className="aiops-log-grid"><ErrorTrend /><LogSearch /></div>}
            </div>
          </section>
        </main>
        <aside className="aiops-copilot-panel" aria-label="AI Copilot 人机协作区"><ChatPage embedded /></aside>
      </div>
    </div>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) { return <div><p className="aiops-eyebrow">{eyebrow}</p><h2>{title}</h2></div>; }
function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button className={active ? "active" : ""} onClick={onClick}>{children}</button>; }

function RcaView() {
  return <div className="aiops-rca-view">
    <div className="aiops-view-copy"><span className="aiops-kicker">RCA FLOW</span><h3>等待真实事件进入证据链</h3><p>当前仅展示已实现的数据路径，不生成虚构根因。Agent 获得有效 Evidence 后，将在节点间标记支持和反证关系。</p></div>
    <div className="aiops-topology" aria-label="当前可用的诊断数据链"><TopologyNode status="connected" label="Web SDK" meta="性能 · 错误 · 日志" /><FlowArrow /><TopologyNode status="standby" label="Telemetry API" meta="清洗 · Evidence" /><FlowArrow /><TopologyNode status="standby" label="MCP + Agent" meta="只读诊断" /></div>
    <div className="aiops-evidence-note"><strong>证据规则</strong><span>结论必须附带 Evidence ID、时间范围与诊断 Scope</span></div>
  </div>;
}

function AlertsView() { return <div className="aiops-empty-view"><div className="aiops-empty-icon">0</div><h3>暂无可聚合的告警事件</h3><p>Alertmanager 尚未接入。接入后这里将按时间、服务和语义聚类展示 Incident，并计算可验证的告警压缩率。</p><span className="aiops-outline-chip">Alertmanager · 未配置</span></div>; }
function HealingView() { return <div className="aiops-healing-view"><div className="aiops-safety-card"><div><span className="aiops-warning-icon">!</span><div><strong>自动执行当前关闭</strong><p>第一期只允许只读诊断，不提供 Shell、SSH、SQL 或 kubectl 写操作。</p></div></div><div className="aiops-action-row"><button disabled>拒绝</button><button disabled className="primary">授权 Agent 执行</button></div></div><div className="aiops-roadmap-note"><strong>后续启用条件</strong><p>动作白名单、影响评估、人工审批、审计记录和回滚方案全部通过后，才能开放低风险自愈。</p></div></div>; }
function TopologyNode({ status, label, meta }: { status: "connected" | "standby"; label: string; meta: string }) { return <div className={`aiops-topology-node ${status}`}><span className={`aiops-status-dot ${status}`} /><strong>{label}</strong><small>{meta}</small></div>; }
function FlowArrow() { return <span className="aiops-flow-arrow" aria-hidden="true">→</span>; }

function sourceFromHealth(name: string, detail: string, state: ServiceState) {
  if (state === "online") return { name, detail, status: "connected", label: "在线" } as const;
  if (state === "offline") return { name, detail, status: "offline", label: "离线" } as const;
  return { name, detail, status: "standby", label: "检测中" } as const;
}
