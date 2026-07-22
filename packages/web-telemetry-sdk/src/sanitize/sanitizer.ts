/**
 * 客户端脱敏工具 — 在事件进入传输层前删除或截断敏感内容。
 *
 * 安全不变量：
 * - Token、Cookie、Authorization、完整 Query/Hash 不得出现在发送载荷中
 * - 所有截断静默进行，不抛异常
 * - 序列化或校验失败时丢弃该属性/字段而非阻塞页面
 */

// ---- 长度限制（与 telemetry-contracts schemas/v1.ts 保持一致） ----

export const MAX_MESSAGE_LENGTH = 1024;
export const MAX_STACK_LENGTH = 4096;
export const MAX_FILENAME_LENGTH = 512;
export const MAX_ATTRIBUTE_KEY_LENGTH = 64;
export const MAX_ATTRIBUTE_VALUE_LENGTH = 256;
export const MAX_ATTRIBUTES_COUNT = 20;

// ---- 禁止字段检测 ----

/**
 * 禁止字段正则列表 — 用于在字符串值中检测并排除 Token/Cookie/Authorization 等内容。
 * 所有 pattern 不包含 `g` 标记以避免 RegExp lastIndex 状态问题。
 */
export const FORBIDDEN_PATTERNS: RegExp[] = [
  // Bearer Token（至少 20 字符以减少误报）
  /(?:Bearer|bearer)\s+[A-Za-z0-9\-._~+/]{20,}/,

  // 显式凭据键值对
  /(?:api[_-]?key|secret|token|session[_-]?id|cookie|password|authorization|auth[_-]?token)\s*[=:]\s*\S+/i,
];

/** 检查字符串值是否匹配禁止模式。 */
function matchesForbiddenPattern(value: string): boolean {
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(value)) {
      return true;
    }
  }
  return false;
}

// ---- URL 脱敏 ----

/**
 * 去掉 URL 的 Query (?) 和 Hash (#)，只保留 origin + path。
 *
 * 对于 blob:/data: 等特殊协议，保留完整协议前缀但仍移除 query/hash。
 * 解析失败时静默降级为手动剥离 query/hash。
 */
export function sanitizeUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url, window.location.origin);
  } catch {
    // 无法解析 — 手动剥离 ? 和 #
    const qIdx = url.indexOf('?');
    const hIdx = url.indexOf('#');
    const end = [qIdx, hIdx]
      .filter((i) => i >= 0)
      .reduce((min, i) => Math.min(min, i), url.length);
    return url.slice(0, end);
  }

  // blob: / data: 等特殊协议 — 保留完整 URL 但剥离 query/hash
  if (parsed.protocol === 'blob:' || parsed.protocol === 'data:') {
    const qIdx = url.indexOf('?');
    const hIdx = url.indexOf('#');
    const end = [qIdx, hIdx]
      .filter((i) => i >= 0)
      .reduce((min, i) => Math.min(min, i), url.length);
    return url.slice(0, end);
  }

  return `${parsed.origin}${parsed.pathname}`;
}

// ---- 错误脱敏 ----

/** 截断超长错误消息。 */
export function sanitizeError(message: string, maxLen: number = MAX_MESSAGE_LENGTH): string {
  if (typeof message !== 'string') return String(message);
  return message.length > maxLen ? message.slice(0, maxLen) : message;
}

/** 截断超长堆栈字符串。 */
export function sanitizeStack(stack: string, maxLen: number = MAX_STACK_LENGTH): string {
  if (typeof stack !== 'string') return String(stack);
  return stack.length > maxLen ? stack.slice(0, maxLen) : stack;
}

// ---- 属性脱敏 ----

/**
 * 白名单过滤属性 key；禁止 function/symbol/bigint 类型值；
 * 字符串值检测禁止字段并截断超长值；对象值尝试 JSON 序列化，
 * 失败时丢弃该属性。
 *
 * @param attrs - 原始属性
 * @param allowedKeys - 可选白名单，只允许指定 key（不传则允许所有 key）
 * @returns 脱敏后的属性对象
 */
export function sanitizeAttributes(
  attrs: Record<string, unknown>,
  allowedKeys?: Set<string>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  let count = 0;

  for (const [key, value] of Object.entries(attrs)) {
    // 属性数量上限
    if (count >= MAX_ATTRIBUTES_COUNT) break;

    // 白名单过滤
    if (allowedKeys && !allowedKeys.has(key)) continue;

    // Key 长度检查
    if (key.length > MAX_ATTRIBUTE_KEY_LENGTH) continue;

    // 禁止类型：function / symbol / bigint
    if (typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint') {
      continue;
    }

    // null / undefined → 保留 null
    if (value === null || value === undefined) {
      result[key] = null;
      count++;
      continue;
    }

    // 字符串值：禁止字段检测 + 截断
    if (typeof value === 'string') {
      if (matchesForbiddenPattern(value)) continue;
      result[key] = value.slice(0, MAX_ATTRIBUTE_VALUE_LENGTH);
      count++;
      continue;
    }

    // 数值 / 布尔值 → 直接保留
    if (typeof value === 'number' || typeof value === 'boolean') {
      result[key] = value;
      count++;
      continue;
    }

    // 对象值 → 尝试 JSON 序列化，失败则丢弃
    if (typeof value === 'object') {
      try {
        // 验证可序列化
        JSON.stringify(value);
        result[key] = value;
        count++;
      } catch {
        // 放弃不可序列化对象
        continue;
      }
      continue;
    }

    // 其他未知类型 → 丢弃
  }

  return result;
}
