/**
 * SlowPagesTable — 加载最慢的页面 Top N 表格。
 *
 * 从 API 获取 PageStatsResult，展示路由、样本数、LCP/INP/CLS p75 和错误数。
 * 处理 pending、empty、error、forbidden 和 partial 状态。
 */

import { useEffect, useState } from "react";
import { fetchPageStats } from "../api/client.js";
import type { PageStat, PageStatsResult, QueryStatus } from "../api/types.js";
import type { FilterState } from "../filters/useFilters.js";

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

function formatMs(value: number | null): string {
  if (value === null) return "—";
  return `${Math.round(value).toLocaleString()} ms`;
}

function formatCls(value: number | null): string {
  if (value === null) return "—";
  return value.toFixed(3);
}

// ---- Component ----

export interface SlowPagesTableProps {
  filters: FilterState;
  createSignal: () => AbortSignal;
  limit?: number;
}

export function SlowPagesTable({ filters, createSignal, limit = 10 }: SlowPagesTableProps) {
  const [result, setResult] = useState<PageStatsResult | null>(null);
  const [status, setStatus] = useState<QueryStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { start, end } = computeTimeRange(filters.timeRange);
    const signal = createSignal();

    setStatus("pending");
    setError(null);

    fetchPageStats(start, end, filters.appId, {
      environment: filters.environment,
      release: filters.release || undefined,
      route: filters.route || undefined,
      limit,
      signal,
    })
      .then((data) => {
        setResult(data);
        setStatus(data.queryStatus);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setStatus("error");
        setError(err instanceof Error ? err.message : "未知错误");
      });
  }, [filters.appId, filters.timeRange, filters.environment, filters.release, filters.route, createSignal, limit]);

  // Pending state — skeleton rows
  if (status === "idle" || status === "pending") {
    return (
      <div style={styles['wrapper']}>
        <h3 style={styles['title']}>慢页面 Top {limit}</h3>
        <table style={styles['table']}>
          <thead>
            <tr>
              <Th>路由</Th>
              <Th>样本数</Th>
              <Th>LCP p75</Th>
              <Th>INP p75</Th>
              <Th>CLS p75</Th>
              <Th>错误数</Th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 3 }).map((_, i) => (
              <tr key={i}>
                <td style={styles['cell']}><div style={styles['skeletonCell']} /></td>
                <td style={styles['cell']}><div style={{ ...styles['skeletonCell'], width: 50 }} /></td>
                <td style={styles['cell']}><div style={{ ...styles['skeletonCell'], width: 60 }} /></td>
                <td style={styles['cell']}><div style={{ ...styles['skeletonCell'], width: 60 }} /></td>
                <td style={styles['cell']}><div style={{ ...styles['skeletonCell'], width: 50 }} /></td>
                <td style={styles['cell']}><div style={{ ...styles['skeletonCell'], width: 50 }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Error state
  if (status === "error" || status === "forbidden") {
    return (
      <div style={styles['wrapper']}>
        <h3 style={styles['title']}>慢页面 Top {limit}</h3>
        <div style={styles['errorBox']}>
          <span>
            {status === "forbidden"
              ? "🔒 权限不足，无法查询页面性能"
              : `⚠️ ${error ?? "查询失败"}`}
          </span>
        </div>
      </div>
    );
  }

  // Empty state
  if (!result || result.pages.length === 0) {
    return (
      <div style={styles['wrapper']}>
        <h3 style={styles['title']}>慢页面 Top {limit}</h3>
        <div style={styles['emptyBox']}>📄 无页面数据</div>
      </div>
    );
  }

  const pages: PageStat[] = result.pages;

  return (
    <div style={styles['wrapper']}>
      <div style={styles['headerRow']}>
        <h3 style={styles['title']}>慢页面 Top {limit}</h3>
        {status === "partial" && (
          <span style={styles['partialBadge']}>部分数据</span>
        )}
      </div>
      <div style={styles['tableWrapper']}>
        <table style={styles['table']}>
          <thead>
            <tr>
              <Th>#</Th>
              <Th>路由</Th>
              <Th>样本数</Th>
              <Th>LCP p75</Th>
              <Th>INP p75</Th>
              <Th>CLS p75</Th>
              <Th>错误数</Th>
            </tr>
          </thead>
          <tbody>
            {pages.map((page, idx) => (
              <tr
                key={page.route}
                style={idx % 2 === 0 ? undefined : { background: "#f9fafb" }}
              >
                <td style={{ ...styles['cell'], color: "#9ca3af", fontFamily: "monospace", fontSize: 12 }}>
                  {idx + 1}
                </td>
                <td style={{ ...styles['cell'], fontFamily: "monospace", fontSize: 13, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {page.route}
                </td>
                <td style={{ ...styles['cell'], textAlign: "right" }}>
                  {page.samples.toLocaleString()}
                </td>
                <td style={{ ...styles['cell'], textAlign: "right", fontFamily: "monospace" }}>
                  {formatMs(page.p75.lcp)}
                </td>
                <td style={{ ...styles['cell'], textAlign: "right", fontFamily: "monospace" }}>
                  {formatMs(page.p75.inp)}
                </td>
                <td style={{ ...styles['cell'], textAlign: "right", fontFamily: "monospace" }}>
                  {formatCls(page.p75.cls)}
                </td>
                <td style={{ ...styles['cell'], textAlign: "right" }}>
                  {page.errorCount > 0
                    ? <span style={{ color: "#dc2626", fontWeight: 600 }}>{page.errorCount.toLocaleString()}</span>
                    : <span style={{ color: "#9ca3af" }}>0</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---- Sub-components ----

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{
      textAlign: "left",
      fontSize: 12,
      fontWeight: 600,
      color: "#6b7280",
      padding: "8px 12px",
      borderBottom: "2px solid #e5e7eb",
      whiteSpace: "nowrap",
    }}>
      {children}
    </th>
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
  headerRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  title: {
    margin: 0,
    fontSize: 16,
    fontWeight: 600,
    color: "#111827",
  },
  partialBadge: {
    fontSize: 11,
    color: "#92400e",
    background: "#fef3c7",
    padding: "2px 8px",
    borderRadius: 4,
    fontWeight: 600,
  },
  tableWrapper: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 14,
  },
  cell: {
    padding: "8px 12px",
    borderBottom: "1px solid #f3f4f6",
    verticalAlign: "middle",
  },
  skeletonCell: {
    height: 14,
    background: "#e5e7eb",
    borderRadius: 4,
    width: 80,
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
};
