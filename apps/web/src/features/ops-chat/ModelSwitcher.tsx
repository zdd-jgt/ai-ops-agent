/**
 * Model status is intentionally read-only in Phase 1.
 * Runtime provider changes require a controlled process restart; the UI must not mutate another service's env.
 */
export function ModelSwitcher() {
  return (
    <div style={{ fontSize: 12, color: "#6b7280", textAlign: "right" }}>
      <div style={{ fontWeight: 600, color: "#374151" }}>确定性 Workflow + MCP</div>
      <div>模型切换需修改 Agent Runtime 配置并重启</div>
    </div>
  );
}
