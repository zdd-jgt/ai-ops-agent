/**
 * 事件存储 — 内存 + JSON 文件持久化。
 *
 * 生产环境替换为 PostgreSQL/CloudWatch Logs Insights。
 */
import type { TenantScopedTelemetryEventV1 } from "@ai-ops/telemetry-contracts";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

interface StoredEvent {
  event: TenantScopedTelemetryEventV1;
  ingestedAt: string;
}

const DATA_DIR = join(import.meta.dirname, "../../../runtime-data");
const DATA_FILE = join(DATA_DIR, "events.json");

class EventStore {
  private events: StoredEvent[] = [];
  private maxEvents = 10000;

  constructor() {
    mkdirSync(DATA_DIR, { recursive: true });
    this.load();
  }

  /** 从文件加载 */
  private load(): void {
    try {
      if (existsSync(DATA_FILE)) {
        const raw = readFileSync(DATA_FILE, "utf-8");
        this.events = JSON.parse(raw);
      }
    } catch {
      this.events = [];
    }
  }

  /** 持久化到文件 */
  private save(): void {
    try {
      writeFileSync(DATA_FILE, JSON.stringify(this.events), "utf-8");
    } catch {
      // 静默失败，不影响主流程
    }
  }

  /** 写入事件 */
  write(events: TenantScopedTelemetryEventV1[]): void {
    const now = new Date().toISOString();
    for (const event of events) {
      this.events.push({ event, ingestedAt: now });
    }
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(this.events.length - this.maxEvents);
    }
    this.save();
  }

  /** 按时间范围和 appId 查询 */
  query(filters: { tenantId: string; appId: string; start: string; end: string; environment?: string; release?: string }): TenantScopedTelemetryEventV1[] {
    const startMs = Date.parse(filters.start);
    const endMs = Date.parse(filters.end);

    return this.events
      .filter((e) => {
        if (e.event.app_id !== filters.appId) return false;
        if (e.event.tenant_id !== filters.tenantId) return false;
        if (filters.environment && e.event.environment !== filters.environment) return false;
        if (filters.release && e.event.release !== filters.release) return false;
        const ts = Date.parse(e.event.timestamp);
        return ts >= startMs && ts <= endMs;
      })
      .map((e) => e.event);
  }

  /** 按 Evidence ID 和应用 Scope 查询单条事件。 */
  findById(eventId: string, tenantId: string, appId: string, environment?: string, release?: string): TenantScopedTelemetryEventV1 | undefined {
    return this.events.find((entry) =>
      entry.event.event_id === eventId &&
      entry.event.tenant_id === tenantId &&
      entry.event.app_id === appId &&
      (!environment || entry.event.environment === environment) &&
      (!release || entry.event.release === release))?.event;
  }

  /** 按 event_type 统计 */
  countByType(tenantId: string, appId: string): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const e of this.events) {
      if (e.event.tenant_id !== tenantId || e.event.app_id !== appId) continue;
      counts[e.event.event_type] = (counts[e.event.event_type] ?? 0) + 1;
    }
    return counts;
  }

  /** 总数 */
  get size(): number {
    return this.events.length;
  }

  /** 清空（测试用） */
  clear(): void {
    this.events = [];
  }
}

export const store = new EventStore();
