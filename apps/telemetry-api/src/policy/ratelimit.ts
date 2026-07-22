/**
 * 简易内存限流器 — 按 writeKey 限流。
 *
 * 生产环境应替换为 Redis Sliding Window。
 * 当前实现满足开发/测试阶段的 AC-PIPE-001 验收标准。
 */

interface Bucket {
  tokens: number;
  lastRefill: number;
}

export class RateLimiter {
  private buckets = new Map<string, Bucket>();

  /**
   * @param maxTokens   时间窗口内最大请求数
   * @param windowMs    时间窗口（毫秒）
   */
  constructor(
    private maxTokens: number = 100,
    private windowMs: number = 60_000,
  ) {}

  /** 检查是否可以接受请求。消耗一个 token。 */
  allow(key: string): boolean {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = { tokens: this.maxTokens - 1, lastRefill: now };
      this.buckets.set(key, bucket);
      return true;
    }

    // 令牌桶：按时间补充
    const elapsed = now - bucket.lastRefill;
    const refill = Math.floor((elapsed / this.windowMs) * this.maxTokens);
    if (refill > 0) {
      bucket.tokens = Math.min(this.maxTokens, bucket.tokens + refill);
      bucket.lastRefill = now;
    }

    if (bucket.tokens > 0) {
      bucket.tokens--;
      return true;
    }

    return false;
  }

  /** 获取剩余 token 数（用于监控）。 */
  remaining(key: string): number {
    return this.buckets.get(key)?.tokens ?? this.maxTokens;
  }
}
