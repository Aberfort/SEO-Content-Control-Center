import { describe, expect, it } from "vitest";

import { assertBillingFeatureAvailable, buildBillingFeatureGates } from "./billing-feature-gates";

describe("billing feature gates", () => {
  it("blocks finite limits when usage reaches the plan cap", () => {
    const gates = buildBillingFeatureGates({
      limits: {
        sites: 1,
        urlsPerSite: 500,
        users: 2,
        aiCredits: 0,
        apiAccess: false
      },
      sitesUsed: 1,
      usersUsed: 1
    });

    expect(gates.find((gate) => gate.key === "sites")).toMatchObject({
      used: 1,
      limit: 1,
      remaining: 0,
      allowed: false,
      disabledReason: "Sites limit reached."
    });
    expect(gates.find((gate) => gate.key === "users")).toMatchObject({
      used: 1,
      limit: 2,
      remaining: 1,
      allowed: true
    });
    expect(() => assertBillingFeatureAvailable(gates, "sites")).toThrow("PLAN_SITE_LIMIT_REACHED");
  });

  it("keeps custom limits open", () => {
    const gates = buildBillingFeatureGates({
      limits: {
        sites: "custom",
        urlsPerSite: "custom",
        users: "custom",
        aiCredits: 10000,
        apiAccess: true
      },
      sitesUsed: 100,
      usersUsed: 100
    });

    expect(gates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "sites",
          limit: "custom",
          remaining: "custom",
          allowed: true
        }),
        expect.objectContaining({
          key: "users",
          limit: "custom",
          remaining: "custom",
          allowed: true
        })
      ])
    );
  });
});
