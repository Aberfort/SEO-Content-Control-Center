import { describe, expect, it } from "vitest";

import { calculateTrialEndsAt, trialDurationDays } from "./billing-trial";

describe("billing trial", () => {
  it("uses a bounded local trial period", () => {
    const startedAt = new Date("2026-07-08T10:00:00.000Z");

    expect(trialDurationDays).toBe(14);
    expect(calculateTrialEndsAt(startedAt).toISOString()).toBe("2026-07-22T10:00:00.000Z");
  });
});
