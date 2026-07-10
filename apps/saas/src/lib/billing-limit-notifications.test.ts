import { describe, expect, it } from "vitest";

import { buildAssistantUsage } from "./assistant-usage";
import {
  buildAiCreditLimitNotification,
  buildBillingLimitNotification
} from "./billing-limit-notifications";

describe("billing limit notifications", () => {
  it("builds notifications only for reached finite gates", () => {
    expect(
      buildBillingLimitNotification({
        gate: {
          key: "sites",
          label: "Sites",
          used: 1,
          limit: 1,
          remaining: 0,
          allowed: false,
          disabledReason: "Sites limit reached.",
          disabledCode: null
        },
        planName: "Trial"
      })
    ).toEqual({
      type: "billing.limit.sites_reached",
      title: "Sites limit reached",
      body: "1 of 1 sites are now used on the Trial plan."
    });

    expect(
      buildBillingLimitNotification({
        gate: {
          key: "users",
          label: "Users",
          used: 100,
          limit: "custom",
          remaining: "custom",
          allowed: true,
          disabledReason: null,
          disabledCode: null
        },
        planName: "Enterprise"
      })
    ).toBeNull();

    expect(
      buildBillingLimitNotification({
        gate: {
          key: "sites",
          label: "Sites",
          used: 0,
          limit: 1,
          remaining: 1,
          allowed: false,
          disabledReason: "Trial period has expired. Upgrade to continue.",
          disabledCode: "BILLING_TRIAL_EXPIRED"
        },
        planName: "Trial"
      })
    ).toBeNull();
  });
});

describe("buildAiCreditLimitNotification", () => {
  it("returns null while credits remain", () => {
    expect(
      buildAiCreditLimitNotification({
        usage: buildAssistantUsage({ planCode: "PRO", used: 1 }),
        planName: "Pro"
      })
    ).toBeNull();
  });

  it("builds a notification when the monthly AI credits are exhausted", () => {
    const usage = buildAssistantUsage({ planCode: "PRO", used: 500 });

    expect(
      buildAiCreditLimitNotification({
        usage,
        planName: "Pro"
      })
    ).toEqual({
      type: "billing.limit.ai_credits_reached",
      title: "AI credit limit reached",
      body: "500 of 500 monthly AI credits are now used on the Pro plan. Assistant responses stay deterministic until the next period or an upgrade."
    });
  });
});
