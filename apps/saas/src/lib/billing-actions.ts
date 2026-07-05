import type { PlanCode } from "@sccc/shared";

import type { BillingAction, BillingPlan, BillingSubscription } from "./types";

type BillingProvider = BillingAction["provider"];

type BillingActionInput = {
  plans: BillingPlan[];
  currentPlanCode: PlanCode;
  subscription: BillingSubscription | null;
  canManageBilling: boolean;
  provider?: BillingProvider;
};

export function buildBillingActions(input: BillingActionInput): {
  checkout: BillingAction[];
  portal: BillingAction;
} {
  const provider = input.provider ?? resolveBillingProvider();

  return {
    checkout: input.plans.map((plan) =>
      buildCheckoutAction({
        plan,
        currentPlanCode: input.currentPlanCode,
        canManageBilling: input.canManageBilling,
        provider
      })
    ),
    portal: buildPortalAction({
      subscription: input.subscription,
      canManageBilling: input.canManageBilling,
      provider
    })
  };
}

function resolveBillingProvider(): BillingProvider {
  return process.env.SCCC_BILLING_PROVIDER === "stripe" ? "stripe" : "none";
}

function buildCheckoutAction(input: {
  plan: BillingPlan;
  currentPlanCode: PlanCode;
  canManageBilling: boolean;
  provider: BillingProvider;
}): BillingAction {
  return {
    type: "checkout",
    label:
      input.plan.code === input.currentPlanCode
        ? "Current plan"
        : input.plan.code === "ENTERPRISE"
          ? "Contact sales"
          : "Select plan",
    enabled: false,
    provider: input.provider,
    targetPlanCode: input.plan.code,
    disabledReason: buildCheckoutDisabledReason(input),
    requiresBillingManage: true,
    noMutation: true
  };
}

function buildPortalAction(input: {
  subscription: BillingSubscription | null;
  canManageBilling: boolean;
  provider: BillingProvider;
}): BillingAction {
  return {
    type: "billing_portal",
    label: "Manage billing",
    enabled: false,
    provider: input.provider,
    targetPlanCode: null,
    disabledReason: buildPortalDisabledReason(input),
    requiresBillingManage: true,
    noMutation: true
  };
}

function buildCheckoutDisabledReason(input: {
  plan: BillingPlan;
  currentPlanCode: PlanCode;
  canManageBilling: boolean;
  provider: BillingProvider;
}): string {
  if (!input.canManageBilling) {
    return "Your role can not manage billing.";
  }

  if (input.plan.code === input.currentPlanCode) {
    return "Current plan.";
  }

  if (input.plan.code === "ENTERPRISE") {
    return "Enterprise plan changes require a sales-assisted workflow.";
  }

  if (input.provider === "none") {
    return "Billing provider is not configured.";
  }

  return "Checkout session creation is not enabled yet.";
}

function buildPortalDisabledReason(input: {
  subscription: BillingSubscription | null;
  canManageBilling: boolean;
  provider: BillingProvider;
}): string {
  if (!input.canManageBilling) {
    return "Your role can not manage billing.";
  }

  if (!input.subscription) {
    return "No paid subscription is connected.";
  }

  if (input.provider === "none") {
    return "Billing provider is not configured.";
  }

  return "Billing portal session creation is not enabled yet.";
}
