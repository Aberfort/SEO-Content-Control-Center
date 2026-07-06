import { afterEach, describe, expect, it } from "vitest";

import { createBillingPortalSession, isBillingPortalConfigured } from "./billing-portal";
import { buildFallbackBillingPlans, findBillingPlan } from "./billing-plans";
import type { BillingPortalContext } from "./types";

const plans = buildFallbackBillingPlans();
const context: BillingPortalContext = {
  organizationId: "00000000-0000-4000-8000-000000000601",
  organizationName: "Billing Portal Smoke",
  userEmail: "billing@example.com",
  providerCustomerId: "cus_test_123",
  subscription: {
    id: "subscription-1",
    organizationId: "00000000-0000-4000-8000-000000000601",
    status: "ACTIVE",
    plan: findBillingPlan(plans, "PRO"),
    trialEndsAt: null,
    currentPeriodEnd: "2026-08-01T00:00:00.000Z",
    provider: "stripe",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z"
  }
};

describe("billing portal", () => {
  afterEach(() => {
    delete process.env.SCCC_BILLING_PROVIDER;
    delete process.env.SCCC_STRIPE_SECRET_KEY;
    delete process.env.SCCC_BILLING_PORTAL_RETURN_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  it("keeps portal unavailable without a configured provider", async () => {
    expect(isBillingPortalConfigured()).toBe(false);
    await expect(createBillingPortalSession({ context })).rejects.toThrow(
      "BILLING_PROVIDER_NOT_CONFIGURED"
    );
  });

  it("creates a Stripe billing portal session for the provider customer", async () => {
    process.env.SCCC_BILLING_PROVIDER = "stripe";
    process.env.SCCC_STRIPE_SECRET_KEY = "sk_test_secret";

    const requests: Array<{ url: string; init: RequestInit }> = [];
    const fetcher = async (url: string | URL | Request, init?: RequestInit) => {
      requests.push({ url: String(url), init: init ?? {} });
      return new Response(
        JSON.stringify({
          id: "bps_test_123",
          url: "https://billing.stripe.com/p/session/bps_test_123"
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      );
    };

    await expect(
      createBillingPortalSession({
        context,
        origin: "https://app.example.com",
        fetcher: fetcher as typeof fetch
      })
    ).resolves.toEqual({
      provider: "stripe",
      sessionId: "bps_test_123",
      url: "https://billing.stripe.com/p/session/bps_test_123"
    });

    expect(isBillingPortalConfigured()).toBe(true);
    expect(requests[0]?.url).toBe("https://api.stripe.com/v1/billing_portal/sessions");
    expect(requests[0]?.init.headers).toMatchObject({
      authorization: "Bearer sk_test_secret",
      "content-type": "application/x-www-form-urlencoded"
    });

    const body = requests[0]?.init.body as URLSearchParams;
    expect(body.get("customer")).toBe("cus_test_123");
    expect(body.get("return_url")).toBe("https://app.example.com/dashboard?billing=portal_return");
  });
});
