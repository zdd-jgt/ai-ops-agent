import * as fs from "node:fs";
import * as path from "node:path";
import type { TenantScopedTelemetryEventV1 } from "@ai-ops/telemetry-contracts";
import type { Sink } from "./types.js";

/**
 * Local File Sink — 写入本地 JSON 文件，开发/调试用。
 *
 * 每条事件一行 JSON。文件按小时轮转。
 * 生产部署时不使用此 Sink（仅 stdout）。
 */
export class LocalFileSink implements Sink {
  readonly name = "local-file";
  private stream: fs.WriteStream | null = null;
  private currentHour = "";

  constructor(private dir: string = "./runtime-data/telemetry") {
    fs.mkdirSync(this.dir, { recursive: true });
  }

  write(event: TenantScopedTelemetryEventV1): void {
    this.ensureStream();
    if (this.stream) {
      this.stream.write(JSON.stringify(event) + "\n");
    }
  }

  writeBatch(events: TenantScopedTelemetryEventV1[]): void {
    this.ensureStream();
    if (this.stream) {
      for (const event of events) {
        this.stream.write(JSON.stringify(event) + "\n");
      }
    }
  }

  close(): void {
    if (this.stream) {
      this.stream.end();
      this.stream = null;
    }
  }

  // ---- private ----

  private ensureStream(): void {
    const hour = new Date().toISOString().slice(0, 13); // "2026-07-21T02"
    if (this.stream && this.currentHour === hour) return;

    // 轮转
    if (this.stream) {
      this.stream.end();
    }

    this.currentHour = hour;
    const filename = path.join(this.dir, `events-${hour}.jsonl`);
    this.stream = fs.createWriteStream(filename, { flags: "a" });
  }
}
