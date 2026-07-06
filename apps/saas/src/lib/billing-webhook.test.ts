import { createHmac } from "node:crypto";

import { afterEach, describe, expect, it } from "vitest";

import { buildStripeBillingWebhookUpdate, constructStripeWebhookEvent } from "./billing-webhook";

const secret = "whsec_test_secret";
const timestamp = 1783329000;

describe("billing webhooks", () => {
  afterEach(() => {
    delete process.env.SCCC_STRIPE_PRICE_PRO;
  });

  it("verifies signed Stripe checkout payloads and builds subscription updates", () => {
    const payload = JSON.stringify({
      id: "evt_checkout_completed",
      type: "checkout.session.completed",
      data: {
        object: {
          mode: "subscription",
          customer: "cus_123",
          subscription: "sub_123",
          metadata: {
            organizationId: "00000000-0000-4000-8000-000000000701",
            targetPlanCode: "PRO"
          }
        }
      }
    });
    const event = constructStripeWebhookEvent({
      payload,
      signatureHeader: signPayload(payload),
      secret,
      nowMs: timestamp * 1000
    });

    expect(buildStripeBillingWebhookUpdate(event)).toEqual({
      eventId: "evt_checkout_completed",
      eventType: "checkout.session.completed",
      organizationId: "00000000-0000-4000-8000-000000000701",
      planCode: "PRO",
      customerId: "cus_123",
      subscriptionId: "sub_123",
      status: "ACTIVE",
      currentPeriodEnd: null
    });
  });

  it("rejects invalid or stale signatures", () => {
    const payload = JSON.stringify({
      id: "evt_invalid",
      type: "checkout.session.completed",
      data: {
        object: {}
      }
    });

    expect(() =>
      constructStripeWebhookEvent({
        payload,
        signatureHeader: `t=${timestamp},v1=not-a-real-signature`,
        secret,
        nowMs: timestamp * 1000
      })
    ).toThrow("BILLING_WEBHOOK_SIGNATURE_INVALID");
    expect(() =>
      constructStripeWebhookEvent({
        payload,
        signatureHeader: signPayload(payload),
        secret,
        nowMs: (timestamp + 301) * 1000
      })
    ).toThrow("BILLING_WEBHOOK_SIGNATURE_INVALID");
  });

  it("maps subscription updates from metadata or configured price ids", () => {
    process.env.SCCC_STRIPE_PRICE_PRO = "price_pro";

    const event = {
      id: "evt_subscription_updated",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_123",
          customer: "cus_123",
          status: "past_due",
          current_period_end: 1785921000,
          metadata: {
            organizationId: "00000000-0000-4000-8000-000000000701"
          },
          items: {
            data: [
              {
                price: {
                  id: "price_pro"
                }
              }
            ]
          }
        }
      }
    };

    expect(buildStripeBillingWebhookUpdate(event)).toEqual({
      eventId: "evt_subscription_updated",
      eventType: "customer.subscription.updated",
      organizationId: "00000000-0000-4000-8000-000000000701",
      planCode: "PRO",
      customerId: "cus_123",
      subscriptionId: "sub_123",
      status: "PAST_DUE",
      currentPeriodEnd: new Date(1785921000 * 1000)
    });
  });
});

function signPayload(payload: string): string {
  const signature = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  return `t=${timestamp},v1=${signature}`;
}
