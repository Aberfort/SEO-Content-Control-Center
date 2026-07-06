import type { PlanCode } from "@sccc/shared";

import type { BillingCheckoutContext, BillingCheckoutSession } from "./types";

type Fetcher = typeof fetch;

export type BillingCheckoutErrorCode =
  "BILLING_PROVIDER_NOT_CONFIGURED" | "BILLING_PRICE_NOT_CONFIGURED" | "BILLING_CHECKOUT_FAILED";

const checkoutEligiblePlanCodes = ["STARTER", "PRO", "AGENCY"] satisfies PlanCode[];

export async function createBillingCheckoutSession(input: {
  context: BillingCheckoutContext;
  origin?: string | null;
  fetcher?: Fetcher;
}): Promise<BillingCheckoutSession> {
  if (resolveBillingProvider() !== "stripe") {
    throw new Error("BILLING_PROVIDER_NOT_CONFIGURED");
  }

  const secretKey = process.env.SCCC_STRIPE_SECRET_KEY;
  const priceId = resolveStripePriceId(input.context.targetPlan.code);

  if (!secretKey || !priceId) {
    throw new Error("BILLING_PRICE_NOT_CONFIGURED");
  }

  const response = await (input.fetcher ?? fetch)("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${secretKey}`,
      "content-type": "application/x-www-form-urlencoded"
    },
    body: buildStripeCheckoutBody({
      context: input.context,
      priceId,
      origin: input.origin
    })
  });

  if (!response.ok) {
    throw new Error("BILLING_CHECKOUT_FAILED");
  }

  const payload = (await response.json()) as { id?: unknown; url?: unknown };

  if (typeof payload.id !== "string" || typeof payload.url !== "string") {
    throw new Error("BILLING_CHECKOUT_FAILED");
  }

  return {
    provider: "stripe",
    targetPlanCode: input.context.targetPlan.code,
    sessionId: payload.id,
    url: payload.url
  };
}

export function getConfiguredCheckoutPlanCodes(): PlanCode[] {
  if (resolveBillingProvider() !== "stripe" || !process.env.SCCC_STRIPE_SECRET_KEY) {
    return [];
  }

  return checkoutEligiblePlanCodes.filter((planCode) => Boolean(resolveStripePriceId(planCode)));
}

function buildStripeCheckoutBody(input: {
  context: BillingCheckoutContext;
  priceId: string;
  origin?: string | null;
}): URLSearchParams {
  const successUrl = buildReturnUrl("success", input.context.targetPlan.code, input.origin);
  const cancelUrl = buildReturnUrl("cancel", input.context.targetPlan.code, input.origin);
  const body = new URLSearchParams({
    mode: "subscription",
    client_reference_id: input.context.organizationId,
    customer_email: input.context.userEmail,
    success_url: successUrl,
    cancel_url: cancelUrl,
    "line_items[0][price]": input.priceId,
    "line_items[0][quantity]": "1",
    "metadata[organizationId]": input.context.organizationId,
    "metadata[targetPlanCode]": input.context.targetPlan.code,
    "metadata[currentPlanCode]": input.context.currentPlan.code,
    "subscription_data[metadata][organizationId]": input.context.organizationId,
    "subscription_data[metadata][targetPlanCode]": input.context.targetPlan.code
  });

  if (input.context.subscription?.id) {
    body.set("metadata[currentSubscriptionId]", input.context.subscription.id);
  }

  return body;
}

function buildReturnUrl(kind: "success" | "cancel", planCode: PlanCode, origin?: string | null) {
  const configured =
    kind === "success" ? process.env.SCCC_BILLING_SUCCESS_URL : process.env.SCCC_BILLING_CANCEL_URL;

  if (configured) {
    return configured;
  }

  const base = process.env.NEXT_PUBLIC_APP_URL || origin || "http://localhost:3000";
  const url = new URL("/dashboard", base);
  url.searchParams.set("billing", kind);
  url.searchParams.set("plan", planCode);
  return url.toString();
}

function resolveBillingProvider(): "none" | "stripe" {
  return process.env.SCCC_BILLING_PROVIDER === "stripe" ? "stripe" : "none";
}

function resolveStripePriceId(planCode: PlanCode): string | null {
  const value = process.env[`SCCC_STRIPE_PRICE_${planCode}`];
  return value && value.trim() ? value.trim() : null;
}
