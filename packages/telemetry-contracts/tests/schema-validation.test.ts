/**
 * Schema 校验测试 — 验证 Zod Schema 拒绝非法事件、接受合法事件。
 *
 * 对应: TC-SDK-002
 */
import { describe, it, expect } from "vitest";
import {
  TelemetryEventV1Schema,
  TelemetryBatchV1Schema,
} from "../src/schemas/v1.js";
import {
  validLcpEvent,
  validPageViewEvent,
  validErrorEvent,
  validLogEvent,
  validBatch,
} from "../src/__fixtures__/valid-events.js";
import { invalidFixtures } from "../src/__fixtures__/invalid-events.js";

describe("TelemetryEventV1Schema", () => {
  it("应该接受合法的 LCP 事件", () => {
    const result = TelemetryEventV1Schema.safeParse(validLcpEvent);
    expect(result.success).toBe(true);
  });

  it("应该接受合法的 Page View 事件", () => {
    const result = TelemetryEventV1Schema.safeParse(validPageViewEvent);
    expect(result.success).toBe(true);
  });

  it("应该接受合法的 Error 事件", () => {
    const result = TelemetryEventV1Schema.safeParse(validErrorEvent);
    expect(result.success).toBe(true);
  });

  it("应该接受合法的 Log 事件", () => {
    const result = TelemetryEventV1Schema.safeParse(validLogEvent);
    expect(result.success).toBe(true);
  });

  it("应该接受包含所有 4 种类型的合法批次", () => {
    const result = TelemetryBatchV1Schema.safeParse(validBatch);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.events.length).toBe(4);
    }
  });

  // 测试所有非法夹具
  for (const fixture of invalidFixtures) {
    it(`应该拒绝: ${fixture.label}`, () => {
      const result = TelemetryEventV1Schema.safeParse(fixture.payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        // 验证错误信息包含预期关键词
        const errors = JSON.stringify(result.error.issues);
        expect(errors).toContain(fixture.errorKeyword);
      }
    });
  }
});
