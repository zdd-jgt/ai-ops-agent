/**
 * URL 可分享的受控过滤状态。
 *
 * 所有过滤条件映射到 URL Search Params，支持书签和链接分享。
 * 过滤变化时自动取消旧查询。
 */

import { useSearchParams } from "react-router-dom";
import { useCallback } from "react";

export interface FilterState {
  appId: string;
  environment: string;
  release: string;
  route: string;
  timeRange: "1h" | "6h" | "24h";
}

const DEFAULTS: FilterState = {
  appId: "demo-app",
  environment: "production",
  release: "",
  route: "",
  timeRange: "1h",
};

export function useFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters: FilterState = {
    appId: searchParams.get("appId") ?? DEFAULTS.appId,
    environment: searchParams.get("environment") ?? DEFAULTS.environment,
    release: searchParams.get("release") ?? DEFAULTS.release,
    route: searchParams.get("route") ?? DEFAULTS.route,
    timeRange: (searchParams.get("timeRange") as FilterState["timeRange"]) ?? DEFAULTS.timeRange,
  };

  const setFilter = useCallback(
    (key: keyof FilterState, value: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value && value !== DEFAULTS[key]) {
          next.set(key, value);
        } else {
          next.delete(key);
        }
        return next;
      });
    },
    [setSearchParams],
  );

  const setFilters = useCallback(
    (updates: Partial<FilterState>) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(updates)) {
          if (value && value !== DEFAULTS[key as keyof FilterState]) {
            next.set(key, value);
          } else {
            next.delete(key);
          }
        }
        return next;
      });
    },
    [setSearchParams],
  );

  /** 创建独立的 AbortController（每个组件持有自己的，互不干扰）。 */
  const createSignal = useCallback(() => {
    return new AbortController().signal;
  }, []);

  return { filters, setFilter, setFilters, createSignal };
}
