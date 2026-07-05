import type { PlanLimits } from "@sccc/shared";

import type { BillingFeatureGate, BillingFeatureGateKey } from "./types";

const featureGateLabels = {
  sites: "Sites",
  users: "Users"
} satisfies Record<BillingFeatureGateKey, string>;

const featureGateErrors = {
  sites: "PLAN_SITE_LIMIT_REACHED",
  users: "PLAN_USER_LIMIT_REACHED"
} satisfies Record<BillingFeatureGateKey, string>;

type BillingFeatureGateInput = {
  limits: PlanLimits;
  sitesUsed: number;
  usersUsed: number;
};

export function buildBillingFeatureGates(input: BillingFeatureGateInput): BillingFeatureGate[] {
  return [
    buildBillingFeatureGate("sites", input.sitesUsed, input.limits.sites),
    buildBillingFeatureGate("users", input.usersUsed, input.limits.users)
  ];
}

export function assertBillingFeatureAvailable(
  gates: BillingFeatureGate[],
  key: BillingFeatureGateKey
): void {
  const gate = gates.find((candidate) => candidate.key === key);

  if (gate && !gate.allowed) {
    throw new Error(featureGateErrors[key]);
  }
}

function buildBillingFeatureGate(
  key: BillingFeatureGateKey,
  used: number,
  limit: number | "custom"
): BillingFeatureGate {
  if (limit === "custom") {
    return {
      key,
      label: featureGateLabels[key],
      used,
      limit,
      remaining: "custom",
      allowed: true,
      disabledReason: null
    };
  }

  const remaining = Math.max(limit - used, 0);

  return {
    key,
    label: featureGateLabels[key],
    used,
    limit,
    remaining,
    allowed: remaining > 0,
    disabledReason: remaining > 0 ? null : `${featureGateLabels[key]} limit reached.`
  };
}
