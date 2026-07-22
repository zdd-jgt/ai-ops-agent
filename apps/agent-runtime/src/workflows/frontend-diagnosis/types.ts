export interface DiagnosisInput {
  tenantId: string;
  question: string;
  appId: string;
  environment: string;
  timeRange?: { start: string; end: string };
}

export interface DiagnosisStep {
  name: string;
  status: "pending" | "running" | "complete" | "partial" | "failed" | "skipped";
  evidenceIds: string[];
  summary?: string;
  error?: string;
}

export interface DiagnosisEvidence {
  id: string;
  type: "performance" | "log";
  summary: string;
}

export interface DiagnosisOutput {
  tenantId: string;
  status: "complete" | "partial" | "failed";
  answer: string;
  steps: DiagnosisStep[];
  evidence: DiagnosisEvidence[];
  hypotheses: DiagnosisHypothesis[];
  missingInfo: string[];
  nextRecommendations: string[];
}

export interface DiagnosisHypothesis {
  id: string;
  description: string;
  confidence: number;
  supportingEvidence: string[];
  contradictingEvidence: string[];
}

export interface WorkflowExecutor {
  execute(input: DiagnosisInput): Promise<DiagnosisOutput>;
}
