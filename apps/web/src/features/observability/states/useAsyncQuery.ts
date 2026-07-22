/**
 * 统一异步查询状态管理 — AbortController + 竞态保护 + 状态映射。
 *
 * 解决问题：
 * - 过滤变化时取消旧请求（不覆盖新数据）
 * - 统一 pending / partial / timeout / error / forbidden 状态
 * - 防止内存泄漏（组件卸载时 abort）
 */
import { useState, useEffect, useRef, useCallback } from "react";
import type { QueryStatus } from "../api/types.js";
import { QueryApiError, RateLimitError, ForbiddenError } from "../api/client.js";

export interface AsyncQueryState<T> {
  data: T | null;
  status: QueryStatus;
  error?: string;
}

interface UseAsyncQueryOptions<T> {
  /** 异步获取数据的函数（接收 AbortSignal） */
  fetcher: (signal: AbortSignal) => Promise<T>;
  /** 依赖数组 — 变化时重新查询并取消旧请求 */
  deps: unknown[];
  /** 是否启用查询（默认 true） */
  enabled?: boolean;
}

export function useAsyncQuery<T>({
  fetcher,
  deps,
  enabled = true,
}: UseAsyncQueryOptions<T>): AsyncQueryState<T> {
  const [state, setState] = useState<AsyncQueryState<T>>({
    data: null,
    status: "idle",
  });

  const abortRef = useRef<AbortController | null>(null);
  // 请求序号 — 防止旧请求结果覆盖新请求
  const requestIdRef = useRef(0);

  const run = useCallback(async () => {
    // 取消上一个请求
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;
    const thisRequestId = ++requestIdRef.current;

    setState((prev) => ({ ...prev, status: "pending" }));

    try {
      const data = await fetcher(signal);

      // 竞态保护 — 只有最新请求的结果才写入
      if (thisRequestId !== requestIdRef.current) return;

      setState({ data, status: "complete" });
    } catch (err) {
      // 竞态保护
      if (thisRequestId !== requestIdRef.current) return;

      if (signal.aborted) {
        // 被取消 — 不更新状态（等待新请求）
        return;
      }

      if (err instanceof RateLimitError) {
        setState({ data: null, status: "timeout", error: "请求过于频繁，请稍后重试" });
      } else if (err instanceof ForbiddenError) {
        setState({ data: null, status: "forbidden", error: "无权访问该数据源" });
      } else if (err instanceof QueryApiError) {
        setState({ data: null, status: "error", error: err.message });
      } else if (err instanceof DOMException && err.name === "AbortError") {
        return; // 正常取消
      } else {
        setState({ data: null, status: "error", error: String(err) });
      }
    }
  }, [...deps, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!enabled) {
      setState({ data: null, status: "idle" });
      return;
    }
    run();

    return () => {
      abortRef.current?.abort();
    };
  }, [run, enabled]);

  return state;
}
