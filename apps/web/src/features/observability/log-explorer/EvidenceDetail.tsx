/**
 * EvidenceDetail — 日志详情展开面板（抽屉）。
 *
 * 安全约束（P0）：
 * - 只渲染白名单字段（ALLOWED_FIELDS），拒绝未知字段
 * - 所有内容通过 JSX 文本渲染，不注入 HTML
 * - 禁止使用 dangerouslySetInnerHTML
 * - 服务端脱敏的字段用高亮标记展示
 */
import { useEffect, useState, useCallback } from "react";
import { fetchEvidenceDetail } from "../api/client.js";
import type { EvidenceDetail as EvidenceDetailType } from "../api/types.js";

/** 可渲染的白名单字段 */
const ALLOWED_FIELDS = new Set([
  "eventId",
  "message",
  "level",
  "route",
  "timestamp",
  "attributes",
  "sanitizedFields",
]);

interface Props {
  evidenceId: string;
  appId: string;
  environment?: string;
  release?: string;
  onClose: () => void;
}

type Status = "pending" | "complete" | "error";

export function EvidenceDetail({ evidenceId, appId, environment, release, onClose }: Props) {
  const [data, setData] = useState<EvidenceDetailType | null>(null);
  const [status, setStatus] = useState<Status>("pending");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus("pending");
    setError(null);
    try {
      const result = await fetchEvidenceDetail(evidenceId, appId, { environment, release });
      setData(result);
      setStatus("complete");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "获取 Evidence 详情失败";
      setError(message);
      setStatus("error");
    }
  }, [evidenceId, appId, environment, release]);

  useEffect(() => {
    load();
  }, [load]);

  /** 关闭时点击 ESC */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // ---- 点击遮罩关闭 ----
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  // ---- Render ----

  return (
    <div
      style={overlayStyle}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label="Evidence 详情"
    >
      <div style={drawerStyle}>
        {/* 头部 */}
        <div style={headerStyle}>
          <h3 style={headerTitleStyle}>Evidence 详情</h3>
          <button
            onClick={onClose}
            style={closeButtonStyle}
            aria-label="关闭"
          >
            &#x2715;
          </button>
        </div>

        {/* 内容 */}
        <div style={bodyStyle}>
          {/* 加载中 */}
          {status === "pending" && (
            <div style={centerStyle} role="status">
              加载中...
            </div>
          )}

          {/* 错误 */}
          {status === "error" && (
            <div style={centerStyle} role="alert">
              <span style={{ color: "#dc2626" }}>&#9888; {error}</span>
            </div>
          )}

          {/* 详情内容 */}
          {status === "complete" && data && (
            <>
              {/* 脱敏字段警告 */}
              {data.sanitizedFields && data.sanitizedFields.length > 0 && (
                <div style={sanitizedBannerStyle} role="note">
                  <strong>&#9888; 以下字段已被服务端脱敏：</strong>
                  {data.sanitizedFields.join("、")}
                </div>
              )}

              <FieldTable data={data} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- 白名单字段渲染表 ----

function FieldTable({ data }: { data: EvidenceDetailType }) {
  // 只渲染白名单字段；拿到所有 key 但过滤
  const keys = Object.keys(data) as (keyof EvidenceDetailType)[];

  return (
    <table style={tableStyle}>
      <tbody>
        {keys
          .filter((key) => ALLOWED_FIELDS.has(key))
          .map((key) => {
            // attributes 和 sanitizedFields 需要特殊渲染
            if (key === "attributes") {
              return (
                <FieldRow key={key} label="属性">
                  {data.attributes && Object.keys(data.attributes).length > 0 ? (
                    <table style={subTableStyle}>
                      <tbody>
                        {Object.entries(data.attributes).map(([k, v]) => (
                          <tr key={k}>
                            <td style={attrKeyStyle}>{k}</td>
                            <td style={attrValueStyle}>{v}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <span style={{ color: "#9ca3af" }}>无</span>
                  )}
                </FieldRow>
              );
            }

            if (key === "sanitizedFields") {
              // 已在 banner 中展示，跳过
              return null;
            }

            return (
              <FieldRow key={key} label={fieldLabel(key)}>
                {String(data[key] ?? "")}
              </FieldRow>
            );
          })}
      </tbody>
    </table>
  );
}

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <tr style={fieldRowStyle}>
      <td style={fieldLabelStyle}>{label}</td>
      <td style={fieldValueStyle}>{children}</td>
    </tr>
  );
}

// ---- Helpers ----

function fieldLabel(key: string): string {
  const map: Record<string, string> = {
    eventId: "事件 ID",
    message: "完整消息",
    level: "级别",
    route: "路由",
    timestamp: "时间戳",
    attributes: "属性",
  };
  return map[key] ?? key;
}

// ---- Styles ----

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0,0,0,0.4)",
  display: "flex",
  justifyContent: "flex-end",
  zIndex: 1000,
};

const drawerStyle: React.CSSProperties = {
  width: 520,
  maxWidth: "100vw",
  height: "100%",
  backgroundColor: "#fff",
  display: "flex",
  flexDirection: "column",
  boxShadow: "-4px 0 12px rgba(0,0,0,0.1)",
  overflow: "hidden",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px 16px",
  borderBottom: "1px solid #e5e7eb",
  flexShrink: 0,
};

const headerTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 16,
  fontWeight: 600,
};

const closeButtonStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: 18,
  color: "#6b7280",
  padding: "4px 8px",
  borderRadius: 4,
};

const bodyStyle: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: 16,
};

const centerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 48,
  color: "#6b7280",
};

const sanitizedBannerStyle: React.CSSProperties = {
  backgroundColor: "#fffbeb",
  border: "1px solid #fde68a",
  borderRadius: 4,
  padding: "8px 12px",
  marginBottom: 16,
  fontSize: 12,
  color: "#92400e",
  lineHeight: 1.5,
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
};

const fieldRowStyle: React.CSSProperties = {
  borderBottom: "1px solid #f3f4f6",
  verticalAlign: "top",
};

const fieldLabelStyle: React.CSSProperties = {
  padding: "8px 12px 8px 0",
  fontWeight: 600,
  color: "#374151",
  whiteSpace: "nowrap",
  width: 90,
};

const fieldValueStyle: React.CSSProperties = {
  padding: "8px 0",
  color: "#6b7280",
  wordBreak: "break-word",
  whiteSpace: "pre-wrap",
};

const subTableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 12,
};

const attrKeyStyle: React.CSSProperties = {
  padding: "2px 8px 2px 0",
  fontWeight: 600,
  color: "#374151",
  whiteSpace: "nowrap",
  verticalAlign: "top",
};

const attrValueStyle: React.CSSProperties = {
  padding: "2px 0",
  color: "#6b7280",
  wordBreak: "break-word",
};
