import { describe, expect, it } from "vitest";

import { buildAssistantUsage } from "./assistant-usage";

describe("assistant usage", () => {
  it("builds an unmetered monthly AI-credit envelope from plan limits", () => {
    const usage = buildAssistantUsage({
      planCode: "PRO",
      used: 500,
      referenceDate: new Date("2026-07-05T12:00:00.000Z")
    });

    expect(usage).toEqual({
      metric: "ai_credits",
      periodStart: "2026-07-01T00:00:00.000Z",
      periodEnd: "2026-08-01T00:00:00.000Z",
      used: 500,
      limit: 500,
      remaining: 0,
      limited: true,
      metered: false
    });
  });
});
