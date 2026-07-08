import type { BillingFeatureGate } from "./types";

type BillingLimitNotification = {
  type: string;
  title: string;
  body: string;
};

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
