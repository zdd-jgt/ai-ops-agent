/**
 * 服务端脱敏 — 在事件进入 Sink 前再次清洗。
 *
 * 安全不变量（与 F-001 客户端脱敏互补）：
 * - 禁止字段不出现在 Sink 输出中
 * - 脱敏失败时事件被拒绝，不部分保留
 */

const MAX_STRING_LENGTH = 1024;
const MAX_NESTED_DEPTH = 3;

/** 禁止字段正则（与 @ai-ops/web-telemetry-sdk 保持一致）。 */
const FORBIDDEN: RegExp[] = [
  /(?:Bearer|bearer)\s+[A-Za-z0-9\-._~+/]{20,}/,
  /(?:api[_-]?key|secret|token|session[_-]?id|cookie|password|authorization|auth[_-]?token)\s*[=:]\s*\S+/i,
];

/** 检查字符串是否匹配禁止模式。 */
export function containsForbiddenPattern(value: string): boolean {
  return FORBIDDEN.some((p) => p.test(value));
}

/** 脱敏 URL：去掉 query 和 hash，只保留 origin + path。 */
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    const qIdx = url.indexOf("?");
    const hIdx = url.indexOf("#");
    const end = [qIdx, hIdx].filter((i) => i >= 0).reduce((min, i) => Math.min(min, i), url.length);
    return url.slice(0, end);
  }
}

/**
 * 递归脱敏对象中的字符串值。
 * - 检测禁止字段 → 触发则标记危险
 * - 截断超长字符串
 * - 限制嵌套深度
 * @returns `{ safe: true }` 或 `{ safe: false; reason: string }`
 */
export function sanitizeRecord(
  obj: Record<string, unknown>,
  depth = 0,
): { safe: true; result: Record<string, unknown> } | { safe: false; reason: string } {
  if (depth > MAX_NESTED_DEPTH) {
    return { safe: false, reason: `nesting exceeds ${MAX_NESTED_DEPTH}` };
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      if (containsForbiddenPattern(value)) {
        return { safe: false, reason: `forbidden pattern in key "${key}"` };
      }
      result[key] = value.length > MAX_STRING_LENGTH ? value.slice(0, MAX_STRING_LENGTH) : value;
    } else if (typeof value === "number" || typeof value === "boolean" || value === null) {
      result[key] = value;
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      const nested = sanitizeRecord(value as Record<string, unknown>, depth + 1);
      if (!nested.safe) return nested;
      result[key] = nested.result;
    } else if (Array.isArray(value)) {
      if (value.length > 100) {
        return { safe: false, reason: `array "${key}" exceeds 100 items` };
      }
      const clean: unknown[] = [];
      for (const item of value) {
        if (typeof item === "string") {
          if (containsForbiddenPattern(item)) {
            return { safe: false, reason: `forbidden pattern in array "${key}"` };
          }
          clean.push(item.length > MAX_STRING_LENGTH ? item.slice(0, MAX_STRING_LENGTH) : item);
        } else if (typeof item === "number" || typeof item === "boolean" || item === null) {
          clean.push(item);
        } else {
          // 数组中嵌套对象 → 跳过（不过度处理）
          continue;
        }
      }
      result[key] = clean;
    }
    // 其他类型（function、symbol、bigint、undefined）→ 跳过
  }

  return { safe: true, result };
}

/** 截断字符串到指定长度。 */
export function truncate(value: string, maxLen: number): string {
  return value.length > maxLen ? value.slice(0, maxLen) : value;
}
