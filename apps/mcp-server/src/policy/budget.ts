/**
 * 调用预算策略 — 限制单轮 MCP 工具调用次数和结果数量。
 *
 * 安全不变量：Agent 循环次数和调用预算由策略层控制，模型不能请求更多。
 */

import { getScope } from "./scope.js";

export class BudgetExhaustedError extends Error {
  constructor() {
    super("MCP call budget exhausted for this round");
    this.name = "BudgetExhaustedError";
  }
}

export class BudgetTracker {
  private callsRemaining: number;

  constructor() {
    this.callsRemaining = getScope().maxCallsPerRound;
  }

  /** 消耗一次调用。预算用完抛 BudgetExhaustedError。 */
  consume(): void {
    if (this.callsRemaining <= 0) {
      throw new BudgetExhaustedError();
    }
    this.callsRemaining--;
  }

  /** 剩余调用次数。 */
  get remaining(): number {
    return this.callsRemaining;
  }

  /** 已使用的调用次数。 */
  get used(): number {
    return getScope().maxCallsPerRound - this.callsRemaining;
  }
}

/** 裁剪结果到指定上限。meta 字段标注是否被截断。 */
export function truncateResults<T>(
  items: T[],
  maxItems: number,
): { items: T[]; truncated: boolean } {
  if (items.length <= maxItems) {
    return { items, truncated: false };
  }
  return { items: items.slice(0, maxItems), truncated: true };
}

/** 最大日志搜索条数。 */
export const MAX_LOG_ITEMS = 100;
/** 最大慢页面条数。 */
export const MAX_SLOW_PAGES = 50;
