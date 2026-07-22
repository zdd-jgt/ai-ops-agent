/**
 * 可访问状态指示器 — 非颜色唯一的状态表达。
 *
 * 每种状态同时使用图标 + 文字 + aria-label，不依赖颜色作为唯一区分方式。
 */
import type { QueryStatus } from "../api/types.js";

interface StatusIndicatorProps {
  status: QueryStatus;
  /** 可选：自定义状态消息 */
  message?: string;
}

export function StatusIndicator({ status, message }: StatusIndicatorProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG["error"];

  return (
    <div
      role="status"
      aria-label={config.label}
      aria-live="polite"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "12px 16px",
        borderRadius: 6,
        background: config.bg,
        color: config.color,
        fontSize: 14,
      }}
    >
      <span aria-hidden="true">{config.icon}</span>
      <span>{message ?? config.message}</span>
    </div>
  );
}

/** 骨架屏 — 用于 pending 状态。 */
export function Skeleton({ lines = 3, height = 16 }: { lines?: number; height?: number }) {
  return (
    <div aria-label="加载中" aria-busy="true" role="status">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          style={{
            height,
            background: "#e5e7eb",
            borderRadius: 4,
            marginBottom: 8,
            width: `${100 - (i % 3) * 15}%`,
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
      ))}
    </div>
  );
}

/** 空数据提示。 */
export function EmptyState({ message = "暂无数据" }: { message?: string }) {
  return (
    <div
      role="status"
      aria-label={message}
      style={{
        textAlign: "center",
        padding: 32,
        color: "#6b7280",
        fontSize: 14,
      }}
    >
      <span style={{ fontSize: 32, display: "block", marginBottom: 8 }}>📭</span>
      {message}
    </div>
  );
}

/** 样本不足提示 — 不展示误导性结论。 */
export function InsufficientData({ message = "样本不足，不足以判断" }: { message?: string }) {
  return (
    <div
      role="status"
      aria-label={message}
      style={{
        textAlign: "center",
        padding: 16,
        color: "#9ca3af",
        fontSize: 13,
        fontStyle: "italic",
      }}
    >
      ⚠️ {message}
    </div>
  );
}

// ---- Config ----

const STATUS_CONFIG: Record<QueryStatus, { icon: string; label: string; message: string; bg: string; color: string }> = {
  idle:       { icon: "⏸", label: "等待中", message: "等待数据加载…", bg: "#f9fafb", color: "#6b7280" },
  pending:    { icon: "⏳", label: "加载中", message: "正在加载数据…", bg: "#eff6ff", color: "#2563eb" },
  complete:   { icon: "✅", label: "已完成", message: "数据加载完成", bg: "#f0fdf4", color: "#166534" },
  partial:    { icon: "⚠️", label: "部分数据", message: "部分数据可用，可能存在缺失", bg: "#fef9c3", color: "#854d0e" },
  timeout:    { icon: "⏱", label: "请求超时", message: "请求超时，请缩小时间范围后重试", bg: "#fef3c7", color: "#92400e" },
  error:      { icon: "❌", label: "加载失败", message: "数据加载失败，请稍后重试", bg: "#fef2f2", color: "#dc2626" },
  forbidden:  { icon: "🚫", label: "权限不足", message: "无权访问该数据源，请联系管理员", bg: "#fef2f2", color: "#991b1b" },
};
