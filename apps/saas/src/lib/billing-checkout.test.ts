import { afterEach, describe, expect, it } from "vitest";

import { createBillingCheckoutSession, getConfiguredCheckoutPlanCodes } from "./billing-checkout";
import { buildFallbackBillingPlans, findBillingPlan } from "./billing-plans";
import type { BillingCheckoutContext } from "./types";

const plans = buildFallbackBillingPlans();
const context: BillingCheckoutContext = {
  organizationId: "00000000-0000-4000-8000-000000000501",
  organizationName: "Billing Smoke",
  userEmail: "billing@example.com",
  currentPlan: findBillingPlan(plans, "TRIAL"),
  targetPlan: findBillingPlan(plans, "PRO"),
  subscription: null
};

describe("billing checkout", () => {
  afterEach(() => {
    delete process.env.SCCC_BILLING_PROVIDER;
    delete process.env.SCCC_STRIPE_SECRET_KEY;
    delete process.env.SCCC_STRIPE_PRICE_STARTER;
    delete process.env.SCCC_STRIPE_PRICE_PRO;
    delete process.env.SCCC_STRIPE_PRICE_AGENCY;
    delete process.env.SCCC_BILLING_SUCCESS_URL;
    delete process.env.SCCC_BILLING_CANCEL_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  it("keeps checkout unavailable without a configured provider", async () => {
    await expect(createBillingCheckoutSession({ context })).rejects.toThrow(
      "BILLING_PROVIDER_NOT_CONFIGURED"
    );
    expect(getConfiguredCheckoutPlanCodes()).toEqual([]);
  });

  it("creates a Stripe checkout session with tenant metadata", async () => {
    process.env.SCCC_BILLING_PROVIDER = "stripe";
    process.env.SCCC_STRIPE_SECRET_KEY = "sk_test_secret";
    process.env.SCCC_STRIPE_PRICE_PRO = "price_pro";

    const requests: Array<{ url: string; init: RequestInit }> = [];
    const fetcher = async (url: string | URL | Request, init?: RequestInit) => {
      requests.push({ url: String(url), init: init ?? {} });
      return new Response(
        JSON.stringify({
          id: "cs_test_123",
          url: "https://checkout.stripe.com/c/pay/cs_test_123"
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
      createBillingCheckoutSession({
        context,
        origin: "https://app.example.com",
        fetcher: fetcher as typeof fetch
      })
    ).resolves.toEqual({
      provider: "stripe",
      targetPlanCode: "PRO",
      sessionId: "cs_test_123",
      url: "https://checkout.stripe.com/c/pay/cs_test_123"
    });

    expect(getConfiguredCheckoutPlanCodes()).toEqual(["PRO"]);
    expect(requests[0]?.url).toBe("https://api.stripe.com/v1/checkout/sessions");
    expect(requests[0]?.init.headers).toMatchObject({
      authorization: "Bearer sk_test_secret",
      "content-type": "application/x-www-form-urlencoded"
    });

    const body = requests[0]?.init.body as URLSearchParams;
    expect(body.get("mode")).toBe("subscription");
    expect(body.get("line_items[0][price]")).toBe("price_pro");
    expect(body.get("client_reference_id")).toBe(context.organizationId);
    expect(body.get("metadata[organizationId]")).toBe(context.organizationId);
    expect(body.get("metadata[targetPlanCode]")).toBe("PRO");
    expect(body.get("success_url")).toBe(
      "https://app.example.com/dashboard?billing=success&plan=PRO"
    );
    expect(body.get("cancel_url")).toBe(
      "https://app.example.com/dashboard?billing=cancel&plan=PRO"
    );
  });
});
