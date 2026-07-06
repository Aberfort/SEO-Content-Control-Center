import { getAppRepository } from "@/lib/app-repository";
import { getCurrentUser } from "@/lib/auth";
import { createBillingPortalSession } from "@/lib/billing-portal";
import { assertRequestSameOrigin } from "@/lib/csrf";
import { jsonError, securityError, unauthorizedError } from "@/lib/http";

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
    const portalContext = await repository.getBillingPortalContext({
      user,
      organizationId
    });
    const session = await createBillingPortalSession({
      context: portalContext,
      origin: new URL(request.url).origin
    });

    return Response.json({ data: session }, { status: 201 });
  } catch (error) {
    const response = securityError(error) ?? billingPortalError(error);

    if (response) {
      return response;
    }

    if (error instanceof Error && error.message.startsWith("Role ")) {
      return jsonError(403, "FORBIDDEN", "Your role does not allow managing billing.");
    }

    if (error instanceof Error && error.message === "ORGANIZATION_NOT_FOUND") {
      return jsonError(404, "ORGANIZATION_NOT_FOUND", "Organization was not found.");
    }

    return jsonError(400, "BILLING_PORTAL_FAILED", "Could not create billing portal session.");
  }
}

function billingPortalError(error: unknown): Response | null {
  if (!(error instanceof Error)) {
    return null;
  }

  switch (error.message) {
    case "BILLING_SUBSCRIPTION_NOT_FOUND":
      return jsonError(409, "BILLING_SUBSCRIPTION_NOT_FOUND", "No paid subscription is connected.");
    case "BILLING_PROVIDER_NOT_CONFIGURED":
      return jsonError(
        503,
        "BILLING_PROVIDER_NOT_CONFIGURED",
        "Billing provider is not configured."
      );
    case "BILLING_PORTAL_CUSTOMER_NOT_CONFIGURED":
      return jsonError(
        503,
        "BILLING_PORTAL_CUSTOMER_NOT_CONFIGURED",
        "Billing portal session is not configured for this subscription."
      );
    case "BILLING_PORTAL_FAILED":
      return jsonError(502, "BILLING_PORTAL_FAILED", "Could not create billing portal session.");
    default:
      return null;
  }
}
