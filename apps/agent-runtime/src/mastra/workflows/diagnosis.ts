import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { executeDiagnosis } from "../../workflows/frontend-diagnosis/workflow.js";
import { createInProcessDiagnosisToolSession } from "../../tools/diagnosis-tools.js";

const inputSchema = z.object({
  tenantId: z.string().min(1),
  question: z.string().min(1).max(2000),
  appId: z.string().min(1),
  environment: z.string().min(1),
  timeRange: z.object({ start: z.string(), end: z.string() }).optional(),
});

const outputSchema = z.object({
  answer: z.string(),
  hypotheses: z.array(z.object({
    id: z.string(),
    description: z.string(),
    confidence: z.number(),
    supportingEvidence: z.array(z.string()),
  })),
  missingInfo: z.array(z.string()),
  nextRecommendations: z.array(z.string()),
});

const diagnose = createStep({
  id: "diagnose_with_observability_tools",
  inputSchema,
  outputSchema,
  execute: async ({ inputData }) => {
    const diagnosis = await executeDiagnosis(inputData, createInProcessDiagnosisToolSession);
    return {
      answer: diagnosis.answer,
      hypotheses: diagnosis.hypotheses.map((item) => ({
        id: item.id,
        description: item.description,
        confidence: item.confidence,
        supportingEvidence: item.supportingEvidence,
      })),
      missingInfo: diagnosis.missingInfo,
      nextRecommendations: diagnosis.nextRecommendations,
    };
  },
});

/** Mastra workflow uses the same real Query API adapter as the MCP server; no mock evidence. */
export const diagnosisWorkflow = createWorkflow({
  id: "frontend-diagnosis",
  inputSchema,
  outputSchema,
})
  .then(diagnose)
  .commit();
