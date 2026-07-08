import { describe, expect, it } from "vitest";

import {
  calculateTrialEndsAt,
  getLocalTrialExpiryGateBlock,
  isLocalTrialExpired,
  normalizeLocalTrialStatus,
  trialDurationDays,
  trialExpiredDisabledReason,
  trialExpiredErrorCode
} from "./billing-trial";

describe("billing trial", () => {
  it("uses a bounded local trial period", () => {
    const startedAt = new Date("2026-07-08T10:00:00.000Z");

    expect(trialDurationDays).toBe(14);
    expect(calculateTrialEndsAt(startedAt).toISOString()).toBe("2026-07-22T10:00:00.000Z");
  });

  it("marks expired local trials as past due", () => {
    const subscription = {
      status: "TRIALING" as const,
      provider: null,
      trialEndsAt: "2026-07-22T10:00:00.000Z"
    };
    const now = new Date("2026-07-22T10:00:00.001Z");

    expect(isLocalTrialExpired(subscription, now)).toBe(true);
    expect(normalizeLocalTrialStatus(subscription, now)).toMatchObject({
      status: "PAST_DUE"
    });
    expect(getLocalTrialExpiryGateBlock(subscription, now)).toEqual({
      disabledReason: trialExpiredDisabledReason,
      disabledCode: trialExpiredErrorCode
    });
  });

  it("does not locally expire provider-backed trial subscriptions", () => {
    const subscription = {
      status: "TRIALING" as const,
      provider: "stripe",
      trialEndsAt: "2026-07-01T10:00:00.000Z"
    };

    expect(isLocalTrialExpired(subscription, new Date("2026-07-22T10:00:00.000Z"))).toBe(false);
    expect(normalizeLocalTrialStatus(subscription).status).toBe("TRIALING");
  });
});
