import { createHmac, timingSafeEqual } from "node:crypto";

import { normalizePlanCode } from "./billing-plans";
import type { BillingSubscriptionStatus } from "./types";

const webhookToleranceSeconds = 300;

export type StripeWebhookEvent = {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
};

export type StripeBillingWebhookUpdate = {
  eventId: string;
  eventType: string;
  organizationId: string;
  planCode: NonNullable<ReturnType<typeof normalizePlanCode>>;
  customerId: string;
  subscriptionId: string | null;
  status: BillingSubscriptionStatus;
  currentPeriodEnd: Date | null;
};

export type BillingWebhookApplyResult = {
  eventId: string;
  eventType: string;
  action: "ignored" | "subscription_created" | "subscription_updated" | "subscription_canceled";
  organizationId: string | null;
  planCode: string | null;
};

export function constructStripeWebhookEvent(input: {
  payload: string;
  signatureHeader: string | null;
  secret?: string;
  nowMs?: number;
}): StripeWebhookEvent {
  if (!input.secret) {
    throw new Error("BILLING_WEBHOOK_NOT_CONFIGURED");
  }

  const signature = parseStripeSignatureHeader(input.signatureHeader);

  if (!signature) {
    throw new Error("BILLING_WEBHOOK_SIGNATURE_INVALID");
  }

  const nowMs = input.nowMs ?? Date.now();
  const ageSeconds = Math.abs(nowMs / 1000 - signature.timestamp);

  if (ageSeconds > webhookToleranceSeconds) {
    throw new Error("BILLING_WEBHOOK_SIGNATURE_INVALID");
  }

  const expectedSignature = createHmac("sha256", input.secret)
    .update(`${signature.timestamp}.${input.payload}`)
    .digest("hex");

  if (!signature.signatures.some((candidate) => safelyCompareHex(candidate, expectedSignature))) {
    throw new Error("BILLING_WEBHOOK_SIGNATURE_INVALID");
  }

  const parsed = JSON.parse(input.payload) as unknown;

  if (!isStripeWebhookEvent(parsed)) {
    throw new Error("BILLING_WEBHOOK_PAYLOAD_INVALID");
  }

  return parsed;
}

export function buildStripeBillingWebhookUpdate(
  event: StripeWebhookEvent
): StripeBillingWebhookUpdate | null {
  if (event.type === "checkout.session.completed") {
    return buildCheckoutCompletedUpdate(event);
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    return buildSubscriptionUpdate(event);
  }

  return null;
}

function buildCheckoutCompletedUpdate(
  event: StripeWebhookEvent
): StripeBillingWebhookUpdate | null {
  const object = event.data.object;

  if (readString(object, "mode") !== "subscription") {
    return null;
  }

  const metadata = readMetadata(object);
  const organizationId = readString(metadata, "organizationId");
  const planCode = normalizePlanCode(readString(metadata, "targetPlanCode"));
  const customerId = readString(object, "customer");

  if (!organizationId || !planCode || !customerId) {
    return null;
  }

  return {
    eventId: event.id,
    eventType: event.type,
    organizationId,
    planCode,
    customerId,
    subscriptionId: readString(object, "subscription") || null,
    status: "ACTIVE",
    currentPeriodEnd: null
  };
}

function buildSubscriptionUpdate(event: StripeWebhookEvent): StripeBillingWebhookUpdate | null {
  const object = event.data.object;
  const metadata = readMetadata(object);
  const organizationId = readString(metadata, "organizationId");
  const planCode = normalizePlanCode(
    readString(metadata, "targetPlanCode") || resolvePlanCodeFromPrice(object)
  );
  const customerId = readString(object, "customer");

  if (!organizationId || !planCode || !customerId) {
    return null;
  }

  return {
    eventId: event.id,
    eventType: event.type,
    organizationId,
    planCode,
    customerId,
    subscriptionId: readString(object, "id") || null,
    status:
      event.type === "customer.subscription.deleted"
        ? "CANCELED"
        : mapStripeSubscriptionStatus(readString(object, "status")),
    currentPeriodEnd: readUnixTimestamp(object, "current_period_end")
  };
}

function mapStripeSubscriptionStatus(status: string): BillingSubscriptionStatus {
  switch (status) {
    case "trialing":
      return "TRIALING";
    case "active":
      return "ACTIVE";
    case "past_due":
    case "unpaid":
      return "PAST_DUE";
    case "canceled":
      return "CANCELED";
    case "incomplete":
    case "incomplete_expired":
    default:
      return "INCOMPLETE";
  }
}

function resolvePlanCodeFromPrice(object: Record<string, unknown>): string {
  const priceId = readNestedString(object, ["items", "data", "0", "price", "id"]);

  if (!priceId) {
    return "";
  }

  for (const planCode of ["STARTER", "PRO", "AGENCY"] as const) {
    if (process.env[`SCCC_STRIPE_PRICE_${planCode}`] === priceId) {
      return planCode;
    }
  }

  return "";
}

function parseStripeSignatureHeader(input: string | null): {
  timestamp: number;
  signatures: string[];
} | null {
  if (!input) {
    return null;
  }

  const parts = input.split(",");
  const timestamp = Number(
    parts.map((part) => part.trim().split("=")).find(([key]) => key === "t")?.[1]
  );
  const signatures = parts
    .map((part) => part.trim().split("="))
    .filter(([key, value]) => key === "v1" && Boolean(value))
    .map(([, value]) => value);

  if (!Number.isFinite(timestamp) || signatures.length === 0) {
    return null;
  }

  return {
    timestamp,
    signatures
  };
}

function safelyCompareHex(left: string, right: string): boolean {
  if (!/^[a-f0-9]+$/i.test(left) || left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}

function isStripeWebhookEvent(input: unknown): input is StripeWebhookEvent {
  if (typeof input !== "object" || input === null) {
    return false;
  }

  const candidate = input as {
    id?: unknown;
    type?: unknown;
    data?: {
      object?: unknown;
    };
  };

  return (
    typeof candidate.id === "string" &&
    typeof candidate.type === "string" &&
    typeof candidate.data?.object === "object" &&
    candidate.data.object !== null
  );
}

function readMetadata(input: Record<string, unknown>): Record<string, unknown> {
  const metadata = input.metadata;
  return typeof metadata === "object" && metadata !== null && !Array.isArray(metadata)
    ? (metadata as Record<string, unknown>)
    : {};
}

function readString(input: Record<string, unknown>, key: string): string {
  const value = input[key];
  return typeof value === "string" ? value : "";
}

function readUnixTimestamp(input: Record<string, unknown>, key: string): Date | null {
  const value = input[key];
  return typeof value === "number" && Number.isFinite(value) ? new Date(value * 1000) : null;
}

function readNestedString(input: Record<string, unknown>, path: string[]): string {
  let current: unknown = input;

  for (const key of path) {
    if (typeof current !== "object" || current === null) {
      return "";
    }

    if (Array.isArray(current)) {
      current = current[Number(key)];
    } else {
      current = (current as Record<string, unknown>)[key];
    }
  }

  return typeof current === "string" ? current : "";
}
