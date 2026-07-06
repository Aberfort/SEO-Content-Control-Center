import { ZodError } from "zod";
import { billingCheckoutCreateSchema } from "@sccc/shared";

import { getAppRepository } from "@/lib/app-repository";
import { getCurrentUser } from "@/lib/auth";
import { createBillingCheckoutSession } from "@/lib/billing-checkout";
import { assertRequestSameOrigin } from "@/lib/csrf";
import { jsonError, securityError, unauthorizedError, validationError } from "@/lib/http";

type RouteContext = {
  params: Promise<{
    organizationId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    assertRequestSameOrigin(request);
  } catch (error) {
    const response = securityError(error);

    if (response) {
      return response;
    }

    throw error;
  }

  const user = await getCurrentUser();

  if (!user) {
    return unauthorizedError();
  }

  const { organizationId } = await context.params;
  const repository = getAppRepository();

  try {
    const body = billingCheckoutCreateSchema.parse((await request.json()) as unknown);
    const context = await repository.getBillingCheckoutContext({
      user,
      organizationId,
      planCode: body.planCode
    });
    const session = await createBillingCheckoutSession({
      context,
      origin: new URL(request.url).origin
    });

    return Response.json({ data: session }, { status: 201 });
  } catch (error) {
    const response = securityError(error) ?? billingCheckoutError(error);

    if (response) {
      return response;
    }

    if (error instanceof ZodError) {
      return validationError(error);
    }

    if (error instanceof Error && error.message.startsWith("Role ")) {
      return jsonError(403, "FORBIDDEN", "Your role does not allow managing billing.");
    }

    if (error instanceof Error && error.message === "ORGANIZATION_NOT_FOUND") {
      return jsonError(404, "ORGANIZATION_NOT_FOUND", "Organization was not found.");
    }

    return jsonError(400, "BILLING_CHECKOUT_FAILED", "Could not create checkout session.");
  }
}

function billingCheckoutError(error: unknown): Response | null {
  if (!(error instanceof Error)) {
    return null;
  }

  switch (error.message) {
    case "BILLING_PLAN_NOT_FOUND":
      return jsonError(404, "BILLING_PLAN_NOT_FOUND", "Billing plan was not found.");
    case "BILLING_CURRENT_PLAN_SELECTED":
      return jsonError(409, "BILLING_CURRENT_PLAN_SELECTED", "This is already the current plan.");
    case "BILLING_TRIAL_REQUIRES_INTERNAL_FLOW":
      return jsonError(
        409,
        "BILLING_TRIAL_REQUIRES_INTERNAL_FLOW",
        "Trial changes require an internal downgrade workflow."
      );
    case "BILLING_ENTERPRISE_REQUIRES_SALES":
      return jsonError(
        409,
        "BILLING_ENTERPRISE_REQUIRES_SALES",
        "Enterprise plan changes require a sales-assisted workflow."
      );
    case "BILLING_PROVIDER_NOT_CONFIGURED":
      return jsonError(
        503,
        "BILLING_PROVIDER_NOT_CONFIGURED",
        "Billing provider is not configured."
      );
    case "BILLING_PRICE_NOT_CONFIGURED":
      return jsonError(
        503,
        "BILLING_PRICE_NOT_CONFIGURED",
        "Checkout session is not configured for this plan."
      );
    case "BILLING_CHECKOUT_FAILED":
      return jsonError(502, "BILLING_CHECKOUT_FAILED", "Could not create checkout session.");
    default:
      return null;
  }
}
