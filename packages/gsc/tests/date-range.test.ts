import { describe, expect, it } from "vitest";

import { dateOnlyToDate, daysAgoDate, normalizeDateRange, normalizeInsightRowLimit } from "../src";

describe("gsc date range", () => {
  it("defaults to a 30-day window ending 3 days ago", () => {
    expect(normalizeDateRange({ now: new Date("2026-07-10T06:00:00.000Z") })).toEqual({
      startDate: "2026-06-10",
      endDate: "2026-07-07"
    });
  });

  it("rejects invalid or reversed ranges", () => {
    expect(() => normalizeDateRange({ startDate: "07/01/2026", endDate: "2026-07-05" })).toThrow(
      "GSC_METRIC_DATE_RANGE_INVALID"
    );
    expect(() => normalizeDateRange({ startDate: "2026-07-06", endDate: "2026-07-05" })).toThrow(
      "GSC_METRIC_DATE_RANGE_INVALID"
    );
  });

  it("computes UTC day offsets", () => {
    expect(daysAgoDate(new Date("2026-07-10T23:59:59.000Z"), 3)).toBe("2026-07-07");
  });

  it("converts date-only strings to UTC midnight", () => {
    expect(dateOnlyToDate("2026-07-10").toISOString()).toBe("2026-07-10T00:00:00.000Z");
  });

  it("bounds insight row limits", () => {
    expect(normalizeInsightRowLimit(null)).toBe(100);
    expect(normalizeInsightRowLimit(0)).toBe(1);
    expect(normalizeInsightRowLimit(999999)).toBe(25000);
  });
});
