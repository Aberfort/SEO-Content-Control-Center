import type { AssistantUsage, BillingFeatureGate } from "./types";

type BillingLimitNotification = {
  type: string;
  title: string;
  body: string;
};

export const aiCreditLimitNotificationType = "billing.limit.ai_credits_reached";

/**
 * Built when an assistant AI call is blocked because the monthly AI-credit
 * allowance is exhausted. Callers deduplicate per usage period before
 * persisting so repeated assistant reads do not spam the notification list.
 */
export function buildAiCreditLimitNotification(input: {
  usage: AssistantUsage;
  planName: string;
}): BillingLimitNotification | null {
  if (!input.usage.limited) {
    return null;
  }

  return {
    type: aiCreditLimitNotificationType,
    title: "AI credit limit reached",
    body: `${input.usage.used.toLocaleString("en")} of ${input.usage.limit.toLocaleString("en")} monthly AI credits are now used on the ${input.planName} plan. Assistant responses stay deterministic until the next period or an upgrade.`
  };
}

export function buildBillingLimitNotification(input: {
  gate: BillingFeatureGate;
  planName: string;
}): BillingLimitNotification | null {
  if (input.gate.limit === "custom" || input.gate.allowed || input.gate.disabledCode) {
    return null;
  }

  return {
    type: `billing.limit.${input.gate.key}_reached`,
    title: `${input.gate.label} limit reached`,
    body: `${input.gate.used.toLocaleString("en")} of ${input.gate.limit.toLocaleString("en")} ${input.gate.label.toLowerCase()} are now used on the ${input.planName} plan.`
  };
}
