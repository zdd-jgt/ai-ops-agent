import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useFilters } from "../observability/filters/useFilters.js";
import { ModelSwitcher } from "./ModelSwitcher.js";

interface ChatMessage { id: string; role: "user" | "agent"; content: string; evidence?: EvidenceRef[]; steps?: StepStatus[]; timestamp: string; }
interface EvidenceRef { id: string; type: "performance" | "log"; summary: string; }
interface StepStatus { name: string; status: "pending" | "running" | "complete" | "partial" | "failed" | "skipped"; error?: string; }
interface DiagnosisResponse { status: "complete" | "partial" | "failed"; answer: string; evidence: EvidenceRef[]; steps: StepStatus[]; missingInfo: string[]; nextRecommendations: string[]; }

const DEV_TOKEN = import.meta.env["VITE_AIOPS_DEV_TOKEN"] as string | undefined;

export function ChatPage({ embedded = false }: { embedded?: boolean }) {
  const { filters } = useFilters();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const focusAgent = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", focusAgent);
    return () => window.removeEventListener("keydown", focusAgent);
  }, []);

  const handleSend = useCallback(async () => {
    const question = input.trim();
    if (!question || isRunning) return;
    setMessages((previous) => [...previous, { id: crypto.randomUUID(), role: "user", content: question, timestamp: new Date().toISOString() }]);
    setInput("");
    setIsRunning(true);
    try {
      const response = await fetch("/agent-api/v1/diagnosis", {
        method: "POST", headers: {
          "Content-Type": "application/json",
          ...(DEV_TOKEN ? { Authorization: `Bearer ${DEV_TOKEN}` } : {}),
        },
        body: JSON.stringify({ question, appId: filters.appId, environment: filters.environment, timeRange: createTimeRange(filters.timeRange) }),
      });
      const body = await response.json() as DiagnosisResponse | { error?: string };
      if (!("answer" in body)) throw new Error(body.error ?? `Agent Runtime ${response.status}`);
      const extras = [
        body.missingInfo.length ? `缺失信息：${body.missingInfo.join("；")}` : "",
        body.nextRecommendations.length ? `下一步：${body.nextRecommendations.join("；")}` : "",
      ].filter(Boolean).join("\n");
      setMessages((previous) => [...previous, {
        id: crypto.randomUUID(), role: "agent", content: `${body.answer}${extras ? `\n${extras}` : ""}`,
        evidence: body.evidence, steps: body.steps, timestamp: new Date().toISOString(),
      }]);
    } catch (error) {
      setMessages((previous) => [...previous, {
        id: crypto.randomUUID(), role: "agent", content: `诊断失败：${error instanceof Error ? error.message : String(error)}`,
        steps: [{ name: "agent_runtime_request", status: "failed" }], timestamp: new Date().toISOString(),
      }]);
    } finally {
      setIsRunning(false);
      inputRef.current?.focus();
    }
  }, [filters, input, isRunning]);

  return (
    <div className={`aiops-chat ${embedded ? "embedded" : "standalone"}`}>
      {!embedded && <Link className="aiops-back-link" to="/">← 返回驾驶舱</Link>}
      <div className="aiops-chat-header"><div><p className="aiops-eyebrow">AGENTIC WORKSPACE</p><h2>AI Copilot</h2></div><span className="aiops-status-dot standby" /></div>
      <ModelSwitcher />
      <div className="aiops-chat-stream" aria-live="polite">
        {messages.length === 0 && <div className="aiops-chat-welcome">
          <span className="aiops-orbit" aria-hidden="true">AI</span><h3>从真实证据开始诊断</h3>
          <p>我会通过只读 MCP 工具查询性能与日志，并展示工具步骤和 Evidence。</p>
          <div className="aiops-suggestions"><button onClick={() => setInput("首页 LCP 为什么偏高？")}>分析页面性能</button><button onClick={() => setInput("最近有什么错误日志？")}>查询错误日志</button></div>
        </div>}
        {messages.map((message) => <MessageBubble key={message.id} message={message} />)}
        {isRunning && <div className="aiops-tool-call"><span className="aiops-spinner" />MCP 正在查询遥测证据…</div>}
      </div>
      <div className="aiops-chat-composer">
        <input ref={inputRef} type="text" value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => event.key === "Enter" && handleSend()} placeholder="例如：首页 LCP 为什么偏高？" disabled={isRunning} />
        <button onClick={handleSend} disabled={isRunning || !input.trim()} aria-label="发送">↑</button>
        <span className="aiops-shortcut">⌘ K 聚焦 · Enter 发送</span>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  return <article className={`aiops-message ${message.role}`}>
    <span className="aiops-message-role">{message.role === "user" ? "YOU" : "AI"}</span><p>{message.content}</p>
    {message.steps && message.steps.length > 0 && <details className="aiops-reasoning" open={message.role === "agent"}><summary>诊断步骤 · {message.steps.length}</summary>{message.steps.map((step, index) => <div key={`${step.name}-${index}`}><span>{step.status === "complete" ? "✓" : step.status === "partial" ? "!" : step.status === "failed" ? "×" : "·"}</span>{step.name}</div>)}</details>}
    {message.evidence && message.evidence.length > 0 && <div className="aiops-evidence-list"><strong>Evidence · {message.evidence.length}</strong>{message.evidence.map((item) => <button key={item.id} title={item.summary}>[{item.type}] {item.id}</button>)}</div>}
    <time>{new Date(message.timestamp).toLocaleTimeString()}</time>
  </article>;
}

function createTimeRange(range: "1h" | "6h" | "24h") { const end = new Date(); const hours = range === "24h" ? 24 : range === "6h" ? 6 : 1; return { start: new Date(end.getTime() - hours * 3_600_000).toISOString(), end: end.toISOString() }; }
