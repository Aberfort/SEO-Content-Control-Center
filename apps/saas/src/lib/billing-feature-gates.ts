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
  disabledReason?: string | null;
  disabledCode?: string | null;
};

export function buildBillingFeatureGates(input: BillingFeatureGateInput): BillingFeatureGate[] {
  const disabled = input.disabledReason
    ? {
        reason: input.disabledReason,
        code: input.disabledCode ?? null
      }
    : null;

  return [
    buildBillingFeatureGate("sites", input.sitesUsed, input.limits.sites, disabled),
    buildBillingFeatureGate("users", input.usersUsed, input.limits.users, disabled)
  ];
}

export function assertBillingFeatureAvailable(
  gates: BillingFeatureGate[],
  key: BillingFeatureGateKey
): void {
  const gate = gates.find((candidate) => candidate.key === key);

  if (!gate || gate.allowed) {
    return;
  }

  if (gate.disabledCode) {
    throw new Error(gate.disabledCode);
  }

  throw new Error(featureGateErrors[key]);
}

function buildBillingFeatureGate(
  key: BillingFeatureGateKey,
  used: number,
  limit: number | "custom",
  disabled: { reason: string; code: string | null } | null
): BillingFeatureGate {
  if (limit === "custom") {
    return {
      key,
      label: featureGateLabels[key],
      used,
      limit,
      remaining: "custom",
      allowed: disabled === null,
      disabledReason: disabled?.reason ?? null,
      disabledCode: disabled?.code ?? null
    };
  }

  const remaining = Math.max(limit - used, 0);
  const allowed = disabled === null && remaining > 0;

  return {
    key,
    label: featureGateLabels[key],
    used,
    limit,
    remaining,
    allowed,
    disabledReason: allowed
      ? null
      : (disabled?.reason ?? `${featureGateLabels[key]} limit reached.`),
    disabledCode: disabled?.code ?? null
  };
}
