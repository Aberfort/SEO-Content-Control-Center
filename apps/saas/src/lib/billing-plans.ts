import { planCodes, planLimits, type PlanCode } from "@sccc/shared";

import type { BillingPlan } from "./types";

const fallbackPlanMeta = {
  TRIAL: { name: "Trial", monthlyPrice: 0 },
  STARTER: { name: "Starter", monthlyPrice: 4900 },
  PRO: { name: "Pro", monthlyPrice: 14900 },
  AGENCY: { name: "Agency", monthlyPrice: 39900 },
  ENTERPRISE: { name: "Enterprise", monthlyPrice: 0 }
} satisfies Record<PlanCode, { name: string; monthlyPrice: number }>;

export function buildFallbackBillingPlans(): BillingPlan[] {
  return planCodes.map((code) => ({
    id: `fallback-${code.toLowerCase()}`,
    code,
    name: fallbackPlanMeta[code].name,
    monthlyPrice: fallbackPlanMeta[code].monthlyPrice,
    limits: planLimits[code],
    isActive: true
  }));
}

export function findBillingPlan(plans: BillingPlan[], code: PlanCode): BillingPlan {
  return (
    plans.find((plan) => plan.code === code) ??
    buildFallbackBillingPlans().find((plan) => plan.code === code) ??
    buildFallbackBillingPlans()[0]
  );
}

export function normalizePlanCode(code: string): PlanCode | null {
  return planCodes.includes(code as PlanCode) ? (code as PlanCode) : null;
}

export function sortBillingPlans(plans: BillingPlan[]): BillingPlan[] {
  return [...plans].sort(
    (left, right) => planCodes.indexOf(left.code) - planCodes.indexOf(right.code)
  );
}
