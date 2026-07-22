/**
 * Origin 策略 — 检查写入请求的来源。
 *
 * 第一期：Origin 白名单检查 + 任意 Origin 记录（不阻塞）。
 * 生产部署前必须配置真实白名单。
 */

const WILDCARD = "*";

export class OriginPolicy {
  private whitelist: Set<string>;

  /** @param allowed 逗号分隔的 origin 列表，或 "*" 表示全放行 */
  constructor(allowed: string = WILDCARD) {
    this.whitelist = new Set(allowed.split(",").map((s) => s.trim()));
  }

  /** 检查 origin 是否在白名单中。 */
  isAllowed(origin: string): boolean {
    if (this.whitelist.has(WILDCARD)) return true;
    return this.whitelist.has(origin);
  }

  /** 更新白名单（运行时热更新）。 */
  updateWhitelist(allowed: string): void {
    this.whitelist = new Set(allowed.split(",").map((s) => s.trim()));
  }
}

/** 默认实例：开发阶段全放行。 */
export const originPolicy = new OriginPolicy(WILDCARD);
