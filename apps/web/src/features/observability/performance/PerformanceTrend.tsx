/**
 * PerformanceTrend — Web Vitals 趋势折线图。
 *
 * 使用 Recharts <LineChart> 展示 LCP、INP、CLS 随时间的变化。
 * 当前 API 返回单时间快照，当时间序列 API 就绪后可扩展数据点。
 */

import { useEffect, useState, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import { fetchPerformanceOverview } from "../api/client.js";
import type { PerformanceOverview, QueryStatus } from "../api/types.js";
import type { FilterState } from "../filters/useFilters.js";

// ---- Thresholds ----

const THRESHOLDS: Record<string, { good: number; poor: number }> = {
  LCP: { good: 2500, poor: 4000 },
  INP: { good: 200, poor: 500 },
  CLS: { good: 0.1, poor: 0.25 },
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

function formatChartTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function formatTooltipValue(metric: string, value: number): string {
  if (metric === "CLS") return value.toFixed(3);
  return `${Math.round(value).toLocaleString()} ms`;
}

// ---- Custom Tooltip ----

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div style={{
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: 6,
      padding: "8px 12px",
      fontSize: 13,
      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
      {payload.map((entry) => (
        <div key={entry.name} style={{ color: entry.color, display: "flex", gap: 8 }}>
          <span>{entry.name}:</span>
          <span style={{ fontWeight: 600 }}>{formatTooltipValue(entry.name, entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ---- Chart Colors ----

const COLORS: Record<string, string> = {
  LCP: "#6366f1",
  INP: "#f59e0b",
  CLS: "#10b981",
};

// ---- Component ----

export interface PerformanceTrendProps {
  filters: FilterState;
  createSignal: () => AbortSignal;
}

interface TrendPoint {
  time: string;
  timeLabel: string;
  LCP?: number;
  INP?: number;
  CLS?: number;
}

export function PerformanceTrend({ filters, createSignal }: PerformanceTrendProps) {
  const [overview, setOverview] = useState<PerformanceOverview | null>(null);
  const [status, setStatus] = useState<QueryStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const trendHistory = useRef<TrendPoint[]>([]);
  const maxPoints = 20;

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
        const point: TrendPoint = {
          time: data.generatedAt,
          timeLabel: formatChartTime(data.generatedAt),
          LCP: data.p75.lcp ?? undefined,
          INP: data.p75.inp ?? undefined,
          CLS: data.p75.cls ?? undefined,
        };
        // 避免重复相同时间点
        const last = trendHistory.current[trendHistory.current.length - 1];
        if (!last || last.time !== point.time) {
          trendHistory.current = [...trendHistory.current, point].slice(-maxPoints);
        }
        setOverview(data);
        setStatus(data.queryStatus);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setStatus("error");
        setError(err instanceof Error ? err.message : "未知错误");
      });
  }, [filters.appId, filters.timeRange, filters.environment, filters.release, filters.route, createSignal]);

  // Pending state
  if (status === "idle" || status === "pending") {
    return (
      <div style={styles['wrapper']}>
        <h3 style={styles['title']}>性能趋势</h3>
        <div style={styles['skeletonChart']}>
          <div style={styles['skeletonLine']} />
        </div>
      </div>
    );
  }

  // Error state
  if (status === "error" || status === "forbidden") {
    return (
      <div style={styles['wrapper']}>
        <h3 style={styles['title']}>性能趋势</h3>
        <div style={styles['errorBox']}>
          <span>{status === "forbidden" ? "🔒 权限不足" : `⚠️ ${error ?? "查询失败"}`}</span>
        </div>
      </div>
    );
  }

  // Empty state
  if (!overview) {
    return (
      <div style={styles['wrapper']}>
        <h3 style={styles['title']}>性能趋势</h3>
        <div style={styles['emptyBox']}>📈 无趋势数据</div>
      </div>
    );
  }

  // Build chart data from accumulated history
  const chartData = trendHistory.current.length > 0 ? trendHistory.current : [
    {
      time: overview.generatedAt,
      timeLabel: formatChartTime(overview.generatedAt),
      LCP: overview.p75.lcp ?? undefined,
      INP: overview.p75.inp ?? undefined,
      CLS: overview.p75.cls ?? undefined,
    },
  ];

  const metrics = ["LCP", "INP", "CLS"] as const;
  const hasEnoughPoints = chartData.length >= 2;

  return (
    <div style={styles['wrapper']}>
      <h3 style={styles['title']}>
        性能趋势
        {!hasEnoughPoints && (
          <span style={{ fontSize: 12, fontWeight: 400, color: "#9ca3af", marginLeft: 8 }}>
            （{chartData.length} 个数据点，继续使用将累积趋势）
          </span>
        )}
      </h3>
      {status === "partial" && (
        <div style={styles['partialNotice']}>⚠️ 部分数据可用，趋势可能不完整</div>
      )}
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="timeLabel" fontSize={12} tick={{ fill: "#6b7280" }} />
          <YAxis
            yAxisId="ms"
            fontSize={12}
            tick={{ fill: "#6b7280" }}
            label={{ value: "ms", angle: -90, position: "insideLeft", style: { fontSize: 12, fill: "#9ca3af" } }}
          />
          <YAxis
            yAxisId="cls"
            orientation="right"
            fontSize={12}
            tick={{ fill: "#6b7280" }}
            domain={[0, 0.5]}
            label={{ value: "CLS", angle: 90, position: "insideRight", style: { fontSize: 12, fill: "#9ca3af" } }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            formatter={(value: string) => (
              <span style={{ color: COLORS[value] ?? "#374151" }}>{value}</span>
            )}
          />

          {metrics.map((metric) => {
            const yAxisId = metric === "CLS" ? "cls" : "ms";
            const thresholds = THRESHOLDS[metric];
            return (
              <Line
                key={metric}
                yAxisId={yAxisId}
                type="monotone"
                dataKey={metric}
                name={metric}
                stroke={COLORS[metric]}
                strokeWidth={2}
                dot={{ r: 5, fill: COLORS[metric], strokeWidth: 0 }}
                connectNulls={false}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---- Styles ----

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: "16px 20px",
    background: "#fff",
  },
  title: {
    margin: 0,
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 12,
    color: "#111827",
  },
  skeletonChart: {
    height: 260,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  skeletonLine: {
    width: "80%",
    height: 200,
    background: "linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)",
    backgroundSize: "200% 100%",
    borderRadius: 4,
  },
  errorBox: {
    padding: "24px 16px",
    textAlign: "center",
    color: "#991b1b",
    background: "#fee2e2",
    borderRadius: 6,
    fontSize: 14,
  },
  emptyBox: {
    padding: "24px 16px",
    textAlign: "center",
    color: "#9ca3af",
    fontSize: 14,
  },
  partialNotice: {
    fontSize: 13,
    color: "#92400e",
    background: "#fef3c7",
    padding: "4px 10px",
    borderRadius: 4,
    marginBottom: 8,
    display: "inline-block",
  },
};
