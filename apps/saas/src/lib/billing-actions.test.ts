import { describe, expect, it } from "vitest";

import { buildBillingActions } from "./billing-actions";
import { buildFallbackBillingPlans, findBillingPlan } from "./billing-plans";

describe("billing actions", () => {
  it("builds disabled checkout and portal actions until provider sessions exist", () => {
    const plans = buildFallbackBillingPlans();
    const actions = buildBillingActions({
      plans,
      currentPlanCode: "TRIAL",
      subscription: null,
      canManageBilling: true,
      provider: "none"
    });

    expect(actions.checkout.find((action) => action.targetPlanCode === "TRIAL")).toMatchObject({
      type: "checkout",
      label: "Current plan",
      enabled: false,
      disabledReason: "Current plan.",
      requiresBillingManage: true,
      noMutation: true
    });
    expect(actions.checkout.find((action) => action.targetPlanCode === "PRO")).toMatchObject({
      type: "checkout",
      label: "Select plan",
      enabled: false,
      provider: "none",
      disabledReason: "Billing provider is not configured."
    });
    expect(actions.checkout.find((action) => action.targetPlanCode === "ENTERPRISE")).toMatchObject(
      {
        label: "Contact sales",
        disabledReason: "Enterprise plan changes require a sales-assisted workflow."
      }
    );
    expect(actions.portal).toMatchObject({
      type: "billing_portal",
      label: "Manage billing",
      enabled: false,
      disabledReason: "No paid subscription is connected."
    });
  });

  it("blocks billing actions for read-only billing roles", () => {
    const plans = buildFallbackBillingPlans();
    const actions = buildBillingActions({
      plans,
      currentPlanCode: "PRO",
      subscription: {
        id: "subscription-1",
        organizationId: "organization-1",
        status: "ACTIVE",
        plan: findBillingPlan(plans, "PRO"),
        trialEndsAt: null,
        currentPeriodEnd: "2026-08-01T00:00:00.000Z",
        provider: "stripe",
        createdAt: "2026-07-01T00:00:00.000Z",
        updatedAt: "2026-07-01T00:00:00.000Z"
      },
      canManageBilling: false,
      provider: "stripe"
    });

    expect(actions.checkout.find((action) => action.targetPlanCode === "AGENCY")).toMatchObject({
      enabled: false,
      disabledReason: "Your role can not manage billing."
    });
    expect(actions.portal).toMatchObject({
      enabled: false,
      disabledReason: "Your role can not manage billing."
    });
  });
});
