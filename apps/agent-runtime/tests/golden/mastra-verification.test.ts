import { beforeAll, describe, expect, it, vi } from "vitest";
import { setScope } from "@ai-ops/mcp-server/policy";
import { diagnosisWorkflow, mastra } from "../../src/mastra/index.js";

beforeAll(() => {
  setScope({ tenantId: "test-tenant", appIds: ["my-app", "test-app"], maxCallsPerRound: 4 });
  vi.stubGlobal("fetch", vi.fn().mockImplementation((input: string | URL | Request) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/performance/overview")) {
      return Promise.resolve(new Response(JSON.stringify({
        queryStatus: "complete",
        sampleCount: 1,
        p75: { lcp: 1800, inp: null, cls: 0.03, fcp: null, ttfb: null },
        evidenceIds: ["real-perf-1"],
      }), { status: 200 }));
    }
    if (url.pathname.endsWith("/logs/search")) {
      return Promise.resolve(new Response(JSON.stringify({
        queryStatus: "complete",
        items: [],
      }), { status: 200 }));
    }
    return Promise.resolve(new Response(JSON.stringify({ error: "not found" }), { status: 404 }));
  }));
});

describe("Mastra phase-0 verification", () => {
  it("creates the real diagnosis workflow", () => {
    expect(diagnosisWorkflow.id).toBe("frontend-diagnosis");
    expect(mastra).toBeDefined();
  });

  it("executes with real adapter output rather than fixed evidence", async () => {
    const run = await diagnosisWorkflow.createRun();
    const result = await run.start({
      inputData: {
        tenantId: "test-tenant",
        question: "首页 LCP 为什么偏高？",
        appId: "my-app",
        environment: "production",
        timeRange: {
          start: "2026-07-21T00:00:00.000Z",
          end: "2026-07-21T01:00:00.000Z",
        },
      },
    });

    expect(result.status).toBe("success");
    expect(result.result?.answer).toContain("证据数：1");
    expect(result.result?.hypotheses[0]?.supportingEvidence).toEqual(["real-perf-1"]);
  });

  it("rejects invalid input through schema validation", async () => {
    const run = await diagnosisWorkflow.createRun();
    await expect(run.start({
      inputData: { tenantId: "test-tenant", question: "", appId: "my-app", environment: "production" },
    })).rejects.toThrow();
  });

  it("creates a unique run ID per execution", async () => {
    const first = await diagnosisWorkflow.createRun();
    const second = await diagnosisWorkflow.createRun();
    expect(first.runId).not.toBe(second.runId);
  });
});
