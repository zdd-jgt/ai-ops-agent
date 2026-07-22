/**
 * LogSearch — 前端日志搜索和列表。
 *
 * 支持按日志级别筛选、按消息关键词搜索、基于游标分页。
 * 点击日志条目展开 EvidenceDetail 抽屉查看完整详情。
 * XSS 防护：所有文本通过 JSX 自动转义，不注入 HTML。
 */
import { useEffect, useState, useCallback, type FormEvent } from "react";
import { useFilters } from "../filters/useFilters.js";
import { fetchLogSearch } from "../api/client.js";
import type { LogEntry, LogSearchResult } from "../api/types.js";
import { EvidenceDetail } from "./EvidenceDetail.js";

type Status = "idle" | "pending" | "complete" | "error";

const LOG_LEVELS = ["all", "debug", "info", "warn", "error"] as const;
const PAGE_SIZE = 20;

export function LogSearch() {
  const { filters, createSignal } = useFilters();

  // 搜索与筛选状态
  const [level, setLevel] = useState<string>("all");
  const [keyword, setKeyword] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // 数据状态
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<LogEntry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [loadedAll, setLoadedAll] = useState(false);

  // Evidence 详情抽屉
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<
    string | null
  >(null);

  /** 初始加载或搜索条件变化时重置列表 */
  const search = useCallback(
    async (cursor?: string) => {
      setStatus("pending");
      setError(null);
      const signal = createSignal();
      try {
        const startTime =
          filters.timeRange === "24h"
            ? new Date(Date.now() - 24 * 3600000).toISOString()
            : filters.timeRange === "6h"
              ? new Date(Date.now() - 6 * 3600000).toISOString()
              : new Date(Date.now() - 3600000).toISOString();
        const endTime = new Date().toISOString();

        const levelParam = level === "all" ? undefined : level;
        const keywordParam = searchTerm || undefined;

        const result: LogSearchResult = await fetchLogSearch(
          startTime,
          endTime,
          filters.appId,
          {
            environment: filters.environment,
            release: filters.release || undefined,
            route: filters.route || undefined,
            level: levelParam,
            messageContains: keywordParam,
            cursor,
            limit: PAGE_SIZE,
            signal,
          },
        );
        if (signal.aborted) return;

        if (cursor) {
          // 加载更多：追加
          setItems((prev) => [...prev, ...result.items]);
        } else {
          // 新搜索：替换
          setItems(result.items);
        }
        setNextCursor(result.nextCursor);
        setLoadedAll(!result.nextCursor);
        setStatus("complete");
      } catch (err: unknown) {
        if (signal.aborted) return;
        const message =
          err instanceof Error ? err.message : "日志搜索失败";
        setError(message);
        setStatus("error");
      }
    },
    [filters.appId, filters.environment, filters.release, filters.route, filters.timeRange, level, searchTerm, createSignal],
  );

  // 过滤或搜索条件变化时重新搜索
  useEffect(() => {
    setItems([]);
    setNextCursor(undefined);
    setLoadedAll(false);
    search();
  }, [search]);

  /** 提交搜索表单（关键词变化时手动触发） */
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setItems([]);
    setNextCursor(undefined);
    setLoadedAll(false);
    setStatus("idle");
    // useEffect 将自动触发 search
    // 但 searchTerm 还未更新，需要手动同步
    // 使用 setTimeout 确保 searchTerm 已更新
    const newKeyword = keyword;
    // 强制触发新搜索：通过 key 变化来触发 useEffect
    // 更好的方式：直接调用 setSearchTerm
    setSearchTerm(newKeyword);
  };

  /** 加载更多 */
  const handleLoadMore = () => {
    if (nextCursor && status !== "pending") {
      search(nextCursor);
    }
  };

  /** 打开 Evidence 详情 */
  const handleSelectEvidence = (evidenceId: string) => {
    setSelectedEvidenceId(evidenceId);
  };

  /** 关闭 Evidence 详情 */
  const handleCloseEvidence = () => {
    setSelectedEvidenceId(null);
  };

  // ---- Render ----

  return (
    <section style={sectionStyle} aria-label="前端日志" role="region">
      <h2 style={headingStyle}>前端日志</h2>

      {/* 筛选栏 */}
      <form onSubmit={handleSubmit} style={toolbarStyle}>
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          style={selectStyle}
          aria-label="日志级别"
        >
          {LOG_LEVELS.map((lvl) => (
            <option key={lvl} value={lvl}>
              {lvl === "all" ? "全部级别" : lvl.toUpperCase()}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜索消息关键词..."
          style={inputStyle}
          aria-label="搜索关键词"
        />
        <button type="submit" style={buttonStyle} disabled={status === "pending"}>
          {status === "pending" ? "搜索中..." : "搜索"}
        </button>
      </form>

      {/* 列表内容 */}
      <div style={listContainerStyle}>
        {/* 初次加载 */}
        {status === "pending" && items.length === 0 && (
          <div style={centerMessageStyle} role="status" aria-label="加载中">
            加载中...
          </div>
        )}

        {/* 错误状态 */}
        {status === "error" && (
          <div style={centerMessageStyle} role="alert">
            <span style={{ color: "#dc2626" }}>&#9888; {error}</span>
          </div>
        )}

        {/* 空结果 */}
        {status === "complete" && items.length === 0 && (
          <div style={centerMessageStyle}>
            没有匹配的日志条目
          </div>
        )}

        {/* 日志列表 */}
        {items.length > 0 && (
          <ul style={listStyle} aria-label="日志条目列表">
            {items.map((entry, idx) => (
              <LogRow
                key={`${entry.evidenceId}-${idx}`}
                entry={entry}
                onSelect={handleSelectEvidence}
              />
            ))}
          </ul>
        )}

        {/* 加载更多 */}
        {status === "pending" && items.length > 0 && (
          <div style={centerMessageStyle}>加载中...</div>
        )}

        {!loadedAll && items.length > 0 && status !== "pending" && (
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <button
              onClick={handleLoadMore}
              style={loadMoreButtonStyle}
            >
              加载更多
            </button>
          </div>
        )}
      </div>

      {/* Evidence 详情抽屉 */}
      {selectedEvidenceId && (
        <EvidenceDetail
          evidenceId={selectedEvidenceId}
          appId={filters.appId}
          environment={filters.environment}
          release={filters.release || undefined}
          onClose={handleCloseEvidence}
        />
      )}
    </section>
  );
}

// ---- 日志行子组件 ----

function LogRow({
  entry,
  onSelect,
}: {
  entry: LogEntry;
  onSelect: (id: string) => void;
}) {
  const levelColor = getLevelColor(entry.eventType);

  return (
    <li
      style={logRowStyle}
      onClick={() => onSelect(entry.evidenceId)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(entry.evidenceId);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`日志条目: ${truncateMessage(entry.message)}`}
    >
      <span style={timeStyle}>{formatTime(entry.timestamp)}</span>
      <span
        style={{
          ...levelBadgeStyle,
          backgroundColor: levelColor.bg,
          color: levelColor.fg,
        }}
      >
        {entry.eventType}
      </span>
      <span style={routeStyle}>{entry.route}</span>
      <span style={messageStyle}>{truncateMessage(entry.message)}</span>
    </li>
  );
}

// ---- Helpers ----

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

function truncateMessage(msg: string, max = 80): string {
  return msg.length > max ? `${msg.slice(0, max)}...` : msg;
}

function getLevelColor(level: string): { bg: string; fg: string } {
  switch (level.toLowerCase()) {
    case "error":
      return { bg: "#fef2f2", fg: "#dc2626" };
    case "warn":
      return { bg: "#fffbeb", fg: "#d97706" };
    case "info":
      return { bg: "#eff6ff", fg: "#2563eb" };
    case "debug":
      return { bg: "#f5f5f5", fg: "#6b7280" };
    default:
      return { bg: "#f9fafb", fg: "#374151" };
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

const toolbarStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  marginBottom: 12,
  flexWrap: "wrap",
};

const selectStyle: React.CSSProperties = {
  padding: "4px 8px",
  borderRadius: 4,
  border: "1px solid #d1d5db",
  fontSize: 13,
};

const inputStyle: React.CSSProperties = {
  padding: "4px 8px",
  borderRadius: 4,
  border: "1px solid #d1d5db",
  fontSize: 13,
  flex: 1,
  minWidth: 160,
};

const buttonStyle: React.CSSProperties = {
  padding: "4px 12px",
  borderRadius: 4,
  border: "1px solid #d1d5db",
  backgroundColor: "#f9fafb",
  cursor: "pointer",
  fontSize: 13,
};

const listContainerStyle: React.CSSProperties = {
  minHeight: 80,
};

const centerMessageStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  color: "#6b7280",
  fontSize: 13,
};

const listStyle: React.CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
};

const logRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  padding: "6px 8px",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: 13,
  borderBottom: "1px solid #f3f4f6",
};

const timeStyle: React.CSSProperties = {
  color: "#6b7280",
  whiteSpace: "nowrap",
  fontFamily: "monospace",
  fontSize: 11,
  minWidth: 70,
};

const levelBadgeStyle: React.CSSProperties = {
  padding: "1px 6px",
  borderRadius: 3,
  fontSize: 10,
  fontWeight: 600,
  textTransform: "uppercase",
  whiteSpace: "nowrap",
  minWidth: 40,
  textAlign: "center",
};

const routeStyle: React.CSSProperties = {
  color: "#374151",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: 160,
  fontFamily: "monospace",
  fontSize: 11,
};

const messageStyle: React.CSSProperties = {
  color: "#374151",
  flex: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const loadMoreButtonStyle: React.CSSProperties = {
  padding: "4px 16px",
  borderRadius: 4,
  border: "1px solid #d1d5db",
  backgroundColor: "#f9fafb",
  cursor: "pointer",
  fontSize: 13,
};
