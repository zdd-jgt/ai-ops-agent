/**
 * VitalsCards — 展示 LCP、INP、CLS 的 p75 卡片。
 *
 * 从 API 获取 PerformanceOverview，每张卡片显示指标名、p75 值、阈值状态和样本数。
 * 颜色不是唯一状态表达方式（使用图标 + 文案）。
 */

import { useEffect, useState } from "react";
import { fetchPerformanceOverview } from "../api/client.js";
import type { PerformanceOverview, QueryStatus } from "../api/types.js";
import type { FilterState } from "../filters/useFilters.js";

// ---- Thresholds ----

interface VitalThreshold {
  good: number;
  poor: number;
}

const THRESHOLDS: Record<string, VitalThreshold> = {
  LCP: { good: 2500, poor: 4000 },
  INP: { good: 200, poor: 500 },
  CLS: { good: 0.1, poor: 0.25 },
};

const MIN_SAMPLE_COUNT = 10;

type VitalStatus = "good" | "needs-improvement" | "poor" | "insufficient";

interface VitalStatusMeta {
  label: string;
  icon: string;
}

const STATUS_META: Record<VitalStatus, VitalStatusMeta> = {
  good: { label: "良好", icon: "✅" },
  "needs-improvement": { label: "需改善", icon: "⚠️" },
  poor: { label: "较差", icon: "❌" },
  insufficient: { label: "不足以判断", icon: "❓" },
};

// ---- Helpers ----

function computeTimeRange(timeRange: string): { start: string; end: string } {
  const end = new Date();
  const ms =
    timeRange === "1h" ? 3_600_000
    : timeRange === "6h" ? 21_600_000
    : 86_400_000;
  const start = new Date(end.getTime() - ms);
  return { start: start.toISOString(), end: end.toISOString() };
}

function evaluateVital(metric: string, value: number | null, sampleCount: number): VitalStatus {
  if (value === null || sampleCount < MIN_SAMPLE_COUNT) return "insufficient";
  const t = THRESHOLDS[metric];
  if (!t) return "insufficient";
  if (value <= t.good) return "good";
  if (value <= t.poor) return "needs-improvement";
  return "poor";
}

function formatValue(metric: string, value: number | null): string {
  if (value === null) return "—";
  if (metric === "CLS") return value.toFixed(3);
  return `${Math.round(value).toLocaleString()} ms`;
}

// ---- Component ----

export interface VitalsCardsProps {
  filters: FilterState;
  createSignal: () => AbortSignal;
}

export function VitalsCards({ filters, createSignal }: VitalsCardsProps) {
  const [overview, setOverview] = useState<PerformanceOverview | null>(null);
  const [status, setStatus] = useState<QueryStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { start, end } = computeTimeRange(filters.timeRange);
    const signal = createSignal();

    setStatus("pending");
    setError(null);

    fetchPerformanceOverview(start, end, filters.appId, {
      environment: filters.environment,
      release: filters.release || undefined,
      route: filters.route || undefined,
      signal,
    })
      .then((data) => {
        setOverview(data);
        setStatus(data.queryStatus);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setStatus("error");
        setError(err instanceof Error ? err.message : "未知错误");
      });
  }, [filters.appId, filters.timeRange, filters.environment, filters.release, filters.route, createSignal]);

  // Pending state — skeleton cards
  if (status === "idle" || status === "pending") {
    return (
      <div style={styles['grid']}>
        {["LCP", "INP", "CLS"].map((m) => (
          <div key={m} style={{ ...styles['card'], opacity: 0.5 }}>
            <div style={styles['skeletonTitle']} />
            <div style={styles['skeletonValue']} />
            <div style={styles['skeletonBadge']} />
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (status === "error" || status === "forbidden") {
    return (
      <div style={styles['errorBox']}>
        <span style={styles['errorIcon']}>
          {status === "forbidden" ? "🔒" : "⚠️"}
        </span>
        <span>
          {status === "forbidden"
            ? "权限不足，无法查询性能数据"
            : `查询失败: ${error ?? "未知错误"}`}
        </span>
      </div>
    );
  }

  // No data / empty state
  if (!overview) {
    return (
      <div style={styles['emptyBox']}>
        <span>📊 无数据</span>
      </div>
    );
  }

  const metrics = ["LCP", "INP", "CLS"] as const;
  const labels: Record<string, string> = { LCP: "LCP", INP: "INP", CLS: "CLS" };
  const descriptions: Record<string, string> = {
    LCP: "最大内容绘制",
    INP: "交互到下次绘制的延迟",
    CLS: "累计布局偏移",
  };

  return (
    <div>
      <div style={styles['grid']}>
        {metrics.map((metric) => {
          const value =
            metric === "LCP" ? overview.p75.lcp
            : metric === "INP" ? overview.p75.inp
            : overview.p75.cls;
          const vitalStatus = evaluateVital(metric, value, overview.sampleCount);
          const meta = STATUS_META[vitalStatus];

          return (
            <div key={metric} style={styles['card']}>
              <div style={styles['cardHeader']}>
                <span style={styles['metricName']}>{labels[metric]}</span>
                <span style={styles['metricDesc']}>{descriptions[metric]}</span>
              </div>
              <div style={styles['metricValue']}>{formatValue(metric, value)}</div>
              <div style={{ ...styles['badge'], ...badgeStyle(vitalStatus) }}>
                <span aria-hidden="true">{meta.icon}</span>
                <span>{meta.label}</span>
              </div>
              <div style={styles['sampleInfo']}>
                样本: {overview.sampleCount.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>
      {status === "partial" && (
        <div style={styles['partialNotice']}>
          ⚠️ 部分数据可用，结果可能不完整
        </div>
      )}
    </div>
  );
}

// ---- Styles ----

function badgeStyle(status: VitalStatus): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "2px 10px",
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
  };
  switch (status) {
    case "good":
      return { ...base, background: "#d1fae5", color: "#065f46" };
    case "needs-improvement":
      return { ...base, background: "#fef3c7", color: "#92400e" };
    case "poor":
      return { ...base, background: "#fee2e2", color: "#991b1b" };
    case "insufficient":
      return { ...base, background: "#f3f4f6", color: "#6b7280" };
  }
}

const styles: Record<string, React.CSSProperties> = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: 16,
  },
  card: {
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: "16px 20px",
    background: "#fff",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  cardHeader: {
    display: "flex",
    alignItems: "baseline",
    gap: 8,
  },
  metricName: {
    fontSize: 16,
    fontWeight: 700,
    fontFamily: "monospace",
  },
  metricDesc: {
    fontSize: 12,
    color: "#6b7280",
  },
  metricValue: {
    fontSize: 28,
    fontWeight: 700,
    fontFamily: "monospace",
    lineHeight: 1.2,
  },
  badge: {},
  sampleInfo: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 4,
  },
  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 16px",
    background: "#fee2e2",
    borderRadius: 8,
    color: "#991b1b",
    fontSize: 14,
  },
  errorIcon: {
    fontSize: 18,
  },
  emptyBox: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px 16px",
    background: "#f9fafb",
    borderRadius: 8,
    color: "#9ca3af",
    fontSize: 14,
  },
  partialNotice: {
    marginTop: 8,
    fontSize: 13,
    color: "#92400e",
    background: "#fef3c7",
    padding: "6px 12px",
    borderRadius: 6,
  },
  skeletonTitle: {
    width: "40%",
    height: 14,
    background: "#e5e7eb",
    borderRadius: 4,
  },
  skeletonValue: {
    width: "60%",
    height: 28,
    background: "#e5e7eb",
    borderRadius: 4,
  },
  skeletonBadge: {
    width: "30%",
    height: 20,
    background: "#e5e7eb",
    borderRadius: 12,
  },
};
