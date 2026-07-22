/**
 * ErrorTrend — 错误数量和错误率随时间变化的趋势图。
 *
 * 使用 Recharts LineChart 双轴图展示错误总数与错误率（%）。
 * 处理 pending / empty / error / complete 四种状态。
 * XSS 防护：所有文本通过 JSX 自动转义，不注入 HTML。
 */
import { useEffect, useState, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useFilters } from "../filters/useFilters.js";
import { fetchErrorTrend } from "../api/client.js";
import type { ErrorTrendPoint, ErrorTrendResult } from "../api/types.js";

/** 可访问标签常量 */
const CHART_TITLE = "错误趋势";
const CHART_DESC = "展示错误数量和错误率随时间变化";

type Status = "idle" | "pending" | "complete" | "error";

export function ErrorTrend() {
  const { filters, createSignal } = useFilters();
  const [data, setData] = useState<ErrorTrendResult | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus("pending");
    setError(null);
    const signal = createSignal();
    try {
      const result = await fetchErrorTrend(
        filters.timeRange === "24h"
          ? new Date(Date.now() - 24 * 3600000).toISOString()
          : filters.timeRange === "6h"
            ? new Date(Date.now() - 6 * 3600000).toISOString()
            : new Date(Date.now() - 3600000).toISOString(),
        new Date().toISOString(),
        filters.appId,
        {
          environment: filters.environment,
          release: filters.release || undefined,
          route: filters.route || undefined,
          signal,
        },
      );
      // Ignore stale responses
      if (signal.aborted) return;
      setData(result);
      setStatus("complete");
    } catch (err: unknown) {
      if (signal.aborted) return;
      const message =
        err instanceof Error ? err.message : "获取错误趋势失败";
      setError(message);
      setStatus("error");
    }
  }, [filters.appId, filters.environment, filters.release, filters.route, filters.timeRange, createSignal]);

  useEffect(() => {
    load();
  }, [load]);

  // ---- Render helpers ----

  if (status === "pending" && !data) {
    return (
      <section style={sectionStyle} aria-label={CHART_TITLE} role="region">
        <h2 style={headingStyle}>{CHART_TITLE}</h2>
        <div
          style={{
            height: 240,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#6b7280",
          }}
          role="status"
          aria-label="加载中"
        >
          加载中...
        </div>
      </section>
    );
  }

  if (status === "error") {
    return (
      <section style={sectionStyle} aria-label={CHART_TITLE} role="region">
        <h2 style={headingStyle}>{CHART_TITLE}</h2>
        <div
          style={{
            height: 240,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#dc2626",
          }}
          role="alert"
        >
          <span>&#9888;</span> {error}
        </div>
      </section>
    );
  }

  if (status === "complete" && (!data || data.points.length === 0)) {
    return (
      <section style={sectionStyle} aria-label={CHART_TITLE} role="region">
        <h2 style={headingStyle}>{CHART_TITLE}</h2>
        <div
          style={{
            height: 240,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#6b7280",
          }}
        >
          不足以判断（样本不足）
        </div>
      </section>
    );
  }

  const chartData: (ErrorTrendPoint & { label: string })[] =
    data?.points.map((p) => ({
      ...p,
      label: formatTime(p.timestamp),
    })) ?? [];

  return (
    <section style={sectionStyle} aria-label={CHART_TITLE} role="region">
      <h2 style={headingStyle}>{CHART_TITLE}</h2>
      <div aria-label={CHART_DESC} role="img">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart
            data={chartData}
            margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#6b7280" }}
              tickLine={false}
            />
            <YAxis
              yAxisId="count"
              orientation="left"
              tick={{ fontSize: 11, fill: "#6b7280" }}
              tickLine={false}
              axisLine={false}
              label={{
                value: "错误数",
                angle: -90,
                position: "insideLeft",
                style: { fontSize: 11, fill: "#6b7280" },
              }}
            />
            <YAxis
              yAxisId="rate"
              orientation="right"
              tick={{ fontSize: 11, fill: "#6b7280" }}
              tickLine={false}
              axisLine={false}
              unit="%"
              label={{
                value: "错误率",
                angle: 90,
                position: "insideRight",
                style: { fontSize: 11, fill: "#6b7280" },
              }}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 4,
                border: "1px solid #d1d5db",
              }}
              formatter={(value: number, name: string) => {
                if (name === "errorCount") return [value, "错误数"];
                if (name === "errorRate") return [`${value}%`, "错误率"];
                return [value, name];
              }}
            />
            <Legend
              formatter={(value: string) =>
                value === "errorCount" ? "错误数" : "错误率"
              }
            />
            <Line
              yAxisId="count"
              type="monotone"
              dataKey="errorCount"
              stroke="#dc2626"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              name="errorCount"
            />
            <Line
              yAxisId="rate"
              type="monotone"
              dataKey="errorRate"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              name="errorRate"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

// ---- Helpers ----

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

// ---- Styles ----

const sectionStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: 16,
  marginBottom: 24,
};

const headingStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  margin: "0 0 12px",
};
