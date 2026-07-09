import { describe, expect, it } from "vitest";

import { buildPageTrafficLoss, buildSiteTrafficLoss, shiftDateOnly } from "./gsc-traffic-loss";
import type { GscDailyMetric, GscSearchInsight } from "./types";

function metric(date: string, clicks: number, impressions = clicks * 10): GscDailyMetric {
  return {
    id: `metric-${date}`,
    siteId: "22222222-2222-4222-8222-222222222222",
    propertyUrl: "https://example.com/",
    date,
    clicks,
    impressions,
    ctr: impressions > 0 ? clicks / impressions : 0,
    position: 5,
    syncedAt: "2026-07-09T00:00:00.000Z"
  };
}

function buildDailyMetrics(days: number, endDate: string, clicksFor: (day: string) => number) {
  const metrics: GscDailyMetric[] = [];

  for (let index = days - 1; index >= 0; index -= 1) {
    const day = shiftDateOnly(endDate, -index);
    metrics.push(metric(day, clicksFor(day)));
  }

  return metrics;
}

function insight(
  page: string,
  clicks: number,
  range: { startDate: string; endDate: string },
  query = "query"
): GscSearchInsight {
  return {
    id: `insight-${page}-${query}-${range.startDate}`,
    siteId: "22222222-2222-4222-8222-222222222222",
    propertyUrl: "https://example.com/",
    startDate: range.startDate,
    endDate: range.endDate,
    page,
    query,
    clicks,
    impressions: clicks * 10,
    ctr: 0.1,
    position: 4,
    syncedAt: "2026-07-09T00:00:00.000Z"
  };
}

const currentRange = { startDate: "2026-06-09", endDate: "2026-07-06" };
const baselineRange = { startDate: "2026-06-02", endDate: "2026-06-29" };

describe("buildSiteTrafficLoss", () => {
  it("reports high severity for a 50 percent click drop with enough volume", () => {
    const metrics = buildDailyMetrics(28, "2026-07-06", (day) => (day >= "2026-06-23" ? 5 : 10));

    const loss = buildSiteTrafficLoss(metrics);

    expect(loss.available).toBe(true);
    expect(loss.previous?.clicks).toBe(140);
    expect(loss.current?.clicks).toBe(70);
    expect(loss.clicksDelta).toBe(-70);
    expect(loss.clicksDropRatio).toBe(0.5);
    expect(loss.severity).toBe("high");
  });

  it("reports medium severity between the medium and high thresholds", () => {
    const metrics = buildDailyMetrics(28, "2026-07-06", (day) => (day >= "2026-06-23" ? 7 : 10));

    expect(buildSiteTrafficLoss(metrics).severity).toBe("medium");
  });

  it("stays quiet for low-volume sites even with large relative drops", () => {
    const metrics = buildDailyMetrics(28, "2026-07-06", (day) => (day >= "2026-06-23" ? 1 : 2));

    const loss = buildSiteTrafficLoss(metrics);

    expect(loss.severity).toBe("none");
    expect(loss.clicksDropRatio).toBe(0.5);
  });

  it("stays quiet when clicks grow", () => {
    const metrics = buildDailyMetrics(28, "2026-07-06", (day) => (day >= "2026-06-23" ? 12 : 10));

    const loss = buildSiteTrafficLoss(metrics);

    expect(loss.severity).toBe("none");
    expect(loss.clicksDelta).toBe(28);
  });

  it("reports missing history instead of guessing", () => {
    const metrics = buildDailyMetrics(10, "2026-07-06", () => 10);

    const loss = buildSiteTrafficLoss(metrics);

    expect(loss.available).toBe(false);
    expect(loss.reason).toContain("Not enough history");
  });

  it("reports missing metrics for unsynced sites", () => {
    expect(buildSiteTrafficLoss([]).available).toBe(false);
  });
});

describe("buildPageTrafficLoss", () => {
  it("returns the pages losing the most clicks against the baseline", () => {
    const current = [
      insight("https://example.com/keep", 100, currentRange),
      insight("https://example.com/drop-hard", 10, currentRange),
      insight("https://example.com/drop-soft", 80, currentRange)
    ];
    const baseline = [
      insight("https://example.com/keep", 100, baselineRange),
      insight("https://example.com/drop-hard", 100, baselineRange),
      insight("https://example.com/drop-soft", 120, baselineRange),
      insight("https://example.com/gone", 40, baselineRange)
    ];

    const loss = buildPageTrafficLoss(current, baseline);

    expect(loss.available).toBe(true);
    expect(loss.drops.map((drop) => drop.page)).toEqual([
      "https://example.com/drop-hard",
      "https://example.com/drop-soft",
      "https://example.com/gone"
    ]);
    expect(loss.drops[0]).toMatchObject({
      currentClicks: 10,
      baselineClicks: 100,
      clicksDelta: -90,
      dropRatio: 0.9
    });
    expect(loss.drops[2]).toMatchObject({ currentClicks: 0, dropRatio: 1 });
  });

  it("aggregates multiple queries per page before comparing", () => {
    const current = [
      insight("https://example.com/page", 10, currentRange, "query-a"),
      insight("https://example.com/page", 10, currentRange, "query-b")
    ];
    const baseline = [
      insight("https://example.com/page", 30, baselineRange, "query-a"),
      insight("https://example.com/page", 30, baselineRange, "query-b")
    ];

    const loss = buildPageTrafficLoss(current, baseline);

    expect(loss.drops).toHaveLength(1);
    expect(loss.drops[0]).toMatchObject({
      currentClicks: 20,
      baselineClicks: 60,
      clicksDelta: -40
    });
  });

  it("skips low-volume baseline pages and small drops", () => {
    const current = [
      insight("https://example.com/tiny", 2, currentRange),
      insight("https://example.com/stable", 90, currentRange)
    ];
    const baseline = [
      insight("https://example.com/tiny", 8, baselineRange),
      insight("https://example.com/stable", 100, baselineRange)
    ];

    expect(buildPageTrafficLoss(current, baseline).drops).toEqual([]);
  });

  it("reports a missing baseline snapshot", () => {
    const loss = buildPageTrafficLoss([insight("https://example.com/a", 10, currentRange)], []);

    expect(loss.available).toBe(false);
    expect(loss.currentRange).toEqual(currentRange);
    expect(loss.reason).toContain("baseline");
  });

  it("reports missing current insights", () => {
    expect(buildPageTrafficLoss([], []).available).toBe(false);
  });
});

describe("shiftDateOnly", () => {
  it("shifts date-only strings across month boundaries", () => {
    expect(shiftDateOnly("2026-07-01", -7)).toBe("2026-06-24");
    expect(shiftDateOnly("2026-06-24", 7)).toBe("2026-07-01");
  });
});
