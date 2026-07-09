import { getAppRepository } from "@/lib/app-repository";
import {
  buildStripeBillingWebhookUpdate,
  constructStripeWebhookEvent
} from "@/lib/billing-webhook";
import { jsonError, securityError } from "@/lib/http";
import { assertRateLimit, rateLimitKeyFromHeaders } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const payload = await request.text();

  try {
    await assertRateLimit("billing-webhook", rateLimitKeyFromHeaders(request.headers));
    const event = constructStripeWebhookEvent({
      payload,
      signatureHeader: request.headers.get("stripe-signature"),
      secret: process.env.STRIPE_WEBHOOK_SECRET
    });
    const update = buildStripeBillingWebhookUpdate(event);

    if (!update) {
      return Response.json({
        data: {
          eventId: event.id,
          eventType: event.type,
          action: "ignored",
          organizationId: null,
          planCode: null
        }
      });
    }

    const repository = getAppRepository();
    return Response.json({
      data: await repository.applyBillingWebhookUpdate(update)
    });
  } catch (error) {
    const response = securityError(error);

    if (response) {
      return response;
    }

    if (error instanceof Error && error.message === "BILLING_WEBHOOK_NOT_CONFIGURED") {
      return jsonError(
        503,
        "BILLING_WEBHOOK_NOT_CONFIGURED",
        "Billing webhook secret is not configured."
      );
    }

    if (
      error instanceof Error &&
      (error.message === "BILLING_WEBHOOK_SIGNATURE_INVALID" ||
        error.message === "BILLING_WEBHOOK_PAYLOAD_INVALID")
    ) {
      return jsonError(400, error.message, "Billing webhook payload could not be verified.");
    }

    return jsonError(400, "BILLING_WEBHOOK_FAILED", "Billing webhook could not be processed.");
  }
}
