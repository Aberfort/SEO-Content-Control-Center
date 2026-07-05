import { planCodes, planLimits, type PlanCode } from "@sccc/shared";

import type { AssistantUsage } from "./types";

export const assistantUsageMetric = "ai_credits";

type AssistantUsageInput = {
  planCode?: string | null;
  used?: number | null;
  referenceDate?: Date;
};

export function buildAssistantUsage(input: AssistantUsageInput = {}): AssistantUsage {
  const planCode = normalizePlanCode(input.planCode);
  const period = getCurrentUsagePeriod(input.referenceDate);
  const limit = planLimits[planCode].aiCredits;
  const used = Math.max(0, Math.trunc(input.used ?? 0));

  return {
    metric: assistantUsageMetric,
    periodStart: period.periodStart.toISOString(),
    periodEnd: period.periodEnd.toISOString(),
    used,
    limit,
    remaining: Math.max(limit - used, 0),
    limited: limit > 0 && used >= limit,
    metered: false
  };
}

export function getCurrentUsagePeriod(referenceDate = new Date()): {
  periodStart: Date;
  periodEnd: Date;
} {
  const periodStart = new Date(
    Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), 1)
  );
  const periodEnd = new Date(
    Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth() + 1, 1)
  );

  return {
    periodStart,
    periodEnd
  };
}

function normalizePlanCode(planCode?: string | null): PlanCode {
  return planCodes.includes(planCode as PlanCode) ? (planCode as PlanCode) : "TRIAL";
}
