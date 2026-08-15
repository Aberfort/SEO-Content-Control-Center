import type { PlanCode } from "./plans";

export const contentTrustDimensions = [
  "experience",
  "expertise",
  "authoritativeness",
  "trust"
] as const;

export type ContentTrustDimension = (typeof contentTrustDimensions)[number];
export type ContentTrustEvidenceStatus = "present" | "missing" | "insufficient" | "human_review";

export type ContentTrustSignal = {
  id: string;
  label: string;
  status: ContentTrustEvidenceStatus;
  evidence: string;
  recommendation: string | null;
  sourceFields: string[];
};

export type ContentTrustDimensionResult = {
  dimension: ContentTrustDimension;
  label: string;
  description: string;
  signals: ContentTrustSignal[];
  counts: Record<ContentTrustEvidenceStatus, number>;
};

export type ContentTrustEvidence = {
  contentItemId: string;
  contentUrl: string;
  access: {
    allowed: boolean;
    planCode: PlanCode;
    minimumPlan: "STARTER";
    reason: string | null;
  };
  dimensions: ContentTrustDimensionResult[];
  summary: Record<ContentTrustEvidenceStatus, number>;
  methodology: {
    title: string;
    statements: string[];
    guidanceUrl: string;
  };
};
