import type { DiagnosisInput, DiagnosisOutput, DiagnosisStep, DiagnosisHypothesis } from "./types.js";
import {
  createMcpDiagnosisToolSession,
  type DiagnosisToolSessionFactory,
} from "../../tools/diagnosis-tools.js";

const HOUR_MS = 3_600_000;

export async function executeDiagnosis(
  input: DiagnosisInput,
  createSession: DiagnosisToolSessionFactory = createMcpDiagnosisToolSession,
): Promise<DiagnosisOutput> {
  const steps: DiagnosisStep[] = [];
  const hypotheses: DiagnosisHypothesis[] = [];
  const evidence: DiagnosisOutput["evidence"] = [];
  const missingInfo: string[] = [];
  const nextRecommendations: string[] = [];

  const question = input.question.trim();
  if (question.length < 3 || question.length > 2000) {
    steps.push({
      name: "validate_question",
      status: "failed",
      evidenceIds: [],
      summary: question.length < 3 ? "问题太短" : "问题过长（>2000 字符）",
    });
    return {
      status: "failed",
      tenantId: input.tenantId,
      answer: "无法开始诊断：请提供 3 到 2000 字符的具体运维问题。",
      steps,
      evidence,
      hypotheses,
      missingInfo: ["请提供更具体的运维问题"],
      nextRecommendations,
    };
  }
  steps.push({ name: "validate_question", status: "complete", evidenceIds: [], summary: "问题格式有效" });

  const end = input.timeRange?.end ?? new Date().toISOString();
  const start = input.timeRange?.start ?? new Date(Date.parse(end) - HOUR_MS).toISOString();
  steps.push({
    name: "resolve_scope_and_time",
    status: "complete",
    evidenceIds: [],
    summary: `tenantId=${input.tenantId}, appId=${input.appId}, env=${input.environment}, range=${start}~${end}`,
  });

  let session: Awaited<ReturnType<DiagnosisToolSessionFactory>>;
  try {
    session = await createSession({
      tenantId: input.tenantId,
      appId: input.appId,
      environment: input.environment,
    });
  } catch (error) {
    const message = errorMessage(error);
    steps.push({ name: "collect_performance_evidence", status: "failed", evidenceIds: [], error: message });
    steps.push({ name: "collect_log_evidence", status: "failed", evidenceIds: [], error: message });
    steps.push({ name: "validate_evidence", status: "failed", evidenceIds: [], summary: "MCP 工具不可用" });
    steps.push({ name: "compose_answer", status: "partial", evidenceIds: [], summary: "仅返回失败说明" });
    return {
      status: "failed",
      tenantId: input.tenantId,
      answer: `诊断工具连接失败，未获得任何可验证证据：${message}`,
      steps,
      evidence,
      hypotheses,
      missingInfo: ["MCP 工具连接失败"],
      nextRecommendations: ["检查 MCP Server 与 Telemetry API 是否已启动，并确认服务端 Scope 配置"],
    };
  }

  let performanceOk = false;
  let logsOk = false;
  try {
    try {
      const performance = await session.tools.queryPagePerformance({
        appId: input.appId,
        environment: input.environment,
        start,
        end,
      });
      performanceOk = performance.queryStatus === "complete";
      const summary = `样本=${performance.sampleCount}, LCP p75=${formatMetric(performance.p75.lcp, "ms")}, INP p75=${formatMetric(performance.p75.inp, "ms")}, CLS p75=${formatMetric(performance.p75.cls)}`;
      for (const id of performance.evidenceIds) evidence.push({ id, type: "performance", summary });
      steps.push({
        name: "collect_performance_evidence",
        status: performanceOk ? "complete" : "partial",
        evidenceIds: performance.evidenceIds,
        summary,
      });

      if (performance.sampleCount === 0 || performance.evidenceIds.length === 0) {
        missingInfo.push("指定范围内没有可验证的 Web Vitals 证据");
      } else if (performance.p75.lcp !== null && performance.p75.lcp > 2500) {
        hypotheses.push({
          id: "hyp_lcp_high",
          description: `LCP p75 为 ${performance.p75.lcp}ms，高于 2500ms 阈值`,
          confidence: 0.85,
          supportingEvidence: performance.evidenceIds,
          contradictingEvidence: [],
        });
        nextRecommendations.push("按相同时间范围检查慢页面与 LCP 资源加载链路");
      }
    } catch (error) {
      steps.push({
        name: "collect_performance_evidence",
        status: "failed",
        evidenceIds: [],
        error: errorMessage(error),
      });
      missingInfo.push("性能查询失败");
    }

    try {
      const logs = await session.tools.searchFrontendLogs({
        appId: input.appId,
        environment: input.environment,
        start,
        end,
        level: "error",
        limit: 20,
      });
      logsOk = logs.queryStatus === "complete";
      for (const item of logs.items) {
        evidence.push({ id: item.evidenceId, type: "log", summary: `${item.route}: ${item.message}` });
      }
      steps.push({
        name: "collect_log_evidence",
        status: logsOk ? "complete" : "partial",
        evidenceIds: logs.evidenceIds,
        summary: `查询到 ${logs.items.length} 条 error 日志`,
      });
      if (logs.items.length > 0) {
        hypotheses.push({
          id: "hyp_frontend_errors",
          description: `指定范围内存在 ${logs.items.length} 条前端错误日志`,
          confidence: 0.9,
          supportingEvidence: logs.evidenceIds,
          contradictingEvidence: [],
        });
        nextRecommendations.push("打开错误 Evidence，按 route 和时间戳定位首个异常");
      } else {
        missingInfo.push("指定范围内没有 error 日志证据");
      }
    } catch (error) {
      steps.push({
        name: "collect_log_evidence",
        status: "failed",
        evidenceIds: [],
        error: errorMessage(error),
      });
      missingInfo.push("日志查询失败");
    }
  } finally {
    await session.close().catch(() => undefined);
  }

  const evidenceIds = [...new Set(evidence.map((item) => item.id))];
  const hasEvidence = evidenceIds.length > 0;
  steps.push({
    name: "validate_evidence",
    status: hasEvidence ? "complete" : "partial",
    evidenceIds,
    summary: hasEvidence ? `校验到 ${evidenceIds.length} 个真实 Evidence ID` : "没有可验证 Evidence，禁止输出确定性结论",
  });

  if (hasEvidence && hypotheses.length === 0) {
    hypotheses.push({
      id: "hyp_no_obvious_signal",
      description: "在当前数据范围内未观察到超阈值 LCP 或 error 日志",
      confidence: 0.65,
      supportingEvidence: evidenceIds,
      contradictingEvidence: [],
    });
    nextRecommendations.push("扩大时间范围或补充具体 route 后重新查询");
  }

  const status: DiagnosisOutput["status"] = performanceOk && logsOk && hasEvidence ? "complete" : "partial";
  const answer = hasEvidence
    ? [
        `诊断范围：appId=${input.appId}，env=${input.environment}，${start} ~ ${end}。`,
        ...hypotheses.map((item) => `候选结论：${item.description}（置信度 ${Math.round(item.confidence * 100)}%）`),
        `证据数：${evidenceIds.length}。`,
      ].join("\n")
    : `诊断范围：appId=${input.appId}，env=${input.environment}，${start} ~ ${end}。\n未获得可验证证据，无法判断是否存在异常。`;

  steps.push({
    name: "compose_answer",
    status: hasEvidence ? "complete" : "partial",
    evidenceIds,
    summary: hasEvidence ? `基于 ${evidenceIds.length} 条证据生成结论` : "返回证据不足说明",
  });

  return { tenantId: input.tenantId, status, answer, steps, evidence, hypotheses, missingInfo, nextRecommendations };
}

function formatMetric(value: number | null, unit = ""): string {
  return value === null ? "无数据" : `${value}${unit}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
