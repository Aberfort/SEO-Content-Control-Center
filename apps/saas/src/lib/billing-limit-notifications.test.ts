import { describe, expect, it } from "vitest";

import { buildBillingLimitNotification } from "./billing-limit-notifications";

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
          disabledReason: "Sites limit reached."
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
          disabledReason: null
        },
        planName: "Enterprise"
      })
    ).toBeNull();
  });
});
