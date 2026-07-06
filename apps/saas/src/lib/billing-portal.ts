import type { BillingPortalContext, BillingPortalSession } from "./types";

type Fetcher = typeof fetch;

export type BillingPortalErrorCode =
  | "BILLING_PROVIDER_NOT_CONFIGURED"
  | "BILLING_PORTAL_CUSTOMER_NOT_CONFIGURED"
  | "BILLING_PORTAL_FAILED";

export async function createBillingPortalSession(input: {
  context: BillingPortalContext;
  origin?: string | null;
  fetcher?: Fetcher;
}): Promise<BillingPortalSession> {
  if (!isBillingPortalConfigured()) {
    throw new Error("BILLING_PROVIDER_NOT_CONFIGURED");
  }

  if (!input.context.providerCustomerId) {
    throw new Error("BILLING_PORTAL_CUSTOMER_NOT_CONFIGURED");
  }

  const response = await (input.fetcher ?? fetch)(
    "https://api.stripe.com/v1/billing_portal/sessions",
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.SCCC_STRIPE_SECRET_KEY}`,
        "content-type": "application/x-www-form-urlencoded"
      },
      body: buildStripePortalBody(input.context, input.origin)
    }
  );

  if (!response.ok) {
    throw new Error("BILLING_PORTAL_FAILED");
  }

  const payload = (await response.json()) as { id?: unknown; url?: unknown };

  if (typeof payload.id !== "string" || typeof payload.url !== "string") {
    throw new Error("BILLING_PORTAL_FAILED");
  }

  return {
    provider: "stripe",
    sessionId: payload.id,
    url: payload.url
  };
}

export function isBillingPortalConfigured(): boolean {
  return (
    process.env.SCCC_BILLING_PROVIDER === "stripe" &&
    Boolean(process.env.SCCC_STRIPE_SECRET_KEY?.trim())
  );
}

function buildStripePortalBody(
  context: BillingPortalContext,
  origin?: string | null
): URLSearchParams {
  return new URLSearchParams({
    customer: context.providerCustomerId,
    return_url: buildPortalReturnUrl(origin)
  });
}

function buildPortalReturnUrl(origin?: string | null): string {
  const configured = process.env.SCCC_BILLING_PORTAL_RETURN_URL;

  if (configured) {
    return configured;
  }

  const base = process.env.NEXT_PUBLIC_APP_URL || origin || "http://localhost:3000";
  const url = new URL("/dashboard", base);
  url.searchParams.set("billing", "portal_return");
  return url.toString();
}
