import type { BillingSubscriptionStatus } from "./types";

export const trialDurationDays = 14;
export const trialExpiredErrorCode = "BILLING_TRIAL_EXPIRED";
export const trialExpiredDisabledReason = "Trial period has expired. Upgrade to continue.";

type TrialDateValue = Date | string | null;

type LocalTrialLike = {
  status: BillingSubscriptionStatus;
  provider: string | null;
  trialEndsAt: TrialDateValue;
};

export function calculateTrialEndsAt(startedAt = new Date()): Date {
  return new Date(startedAt.getTime() + trialDurationDays * 24 * 60 * 60 * 1000);
}

export function isLocalTrialExpired(
  subscription: LocalTrialLike | null,
  now = new Date()
): boolean {
  if (
    !subscription ||
    subscription.provider !== null ||
    !["TRIALING", "PAST_DUE"].includes(subscription.status) ||
    !subscription.trialEndsAt
  ) {
    return false;
  }

  const trialEndsAt = parseTrialDate(subscription.trialEndsAt);

  return trialEndsAt !== null && trialEndsAt.getTime() <= now.getTime();
}

export function normalizeLocalTrialStatus<T extends LocalTrialLike>(
  subscription: T,
  now = new Date()
): T {
  if (!isLocalTrialExpired(subscription, now)) {
    return subscription;
  }

  return {
    ...subscription,
    status: "PAST_DUE"
  };
}

export function getLocalTrialExpiryGateBlock(
  subscription: LocalTrialLike | null,
  now = new Date()
): { disabledReason: string; disabledCode: string } | null {
  if (!isLocalTrialExpired(subscription, now)) {
    return null;
  }

  return {
    disabledReason: trialExpiredDisabledReason,
    disabledCode: trialExpiredErrorCode
  };
}

function parseTrialDate(value: TrialDateValue): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
