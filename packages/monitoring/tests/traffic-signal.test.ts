import { describe, expect, it } from "vitest";

import {
  computePageTrafficSignal,
  computeTrafficSignal,
  type DailyMetricPoint,
  type PageInsightRow
} from "../src/traffic-signal";

function buildPoints(clicksByDay: number[], position = 5): DailyMetricPoint[] {
  return clicksByDay.map((clicks, index) => ({
    date: `2026-08-${String(index + 1).padStart(2, "0")}`,
    clicks,
    position
  }));
}

describe("computeTrafficSignal", () => {
  it("returns no signal when there is not enough history for two full windows", () => {
    const points = buildPoints([50, 50, 50]);
    expect(computeTrafficSignal(points, { windowDays: 7 })).toEqual({
      severity: "none",
      clicksDelta: 0,
      clicksDropRatio: 0,
      positionBefore: null,
      positionAfter: null,
      scope: "site"
    });
  });

  it("returns no signal when the previous window did not have enough clicks", () => {
    const points = buildPoints([1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0]);
    const signal = computeTrafficSignal(points, { windowDays: 7, minPreviousClicks: 20 });
    expect(signal.severity).toBe("none");
  });

  it("detects a medium severity click drop", () => {
    const previousWindow = [20, 20, 20, 20, 20, 20, 20]; // 140 clicks
    const currentWindow = [15, 15, 15, 15, 15, 15, 15]; // 105 clicks, ~25% drop
    const points = buildPoints([...previousWindow, ...currentWindow]);
    const signal = computeTrafficSignal(points, { windowDays: 7 });

    expect(signal.severity).toBe("medium");
    expect(signal.clicksDelta).toBe(-35);
    expect(signal.clicksDropRatio).toBeCloseTo(0.25, 2);
    expect(signal.scope).toBe("site");
  });

  it("detects a high severity click drop", () => {
    const previousWindow = [20, 20, 20, 20, 20, 20, 20]; // 140 clicks
    const currentWindow = [5, 5, 5, 5, 5, 5, 5]; // 35 clicks, 75% drop
    const points = buildPoints([...previousWindow, ...currentWindow]);
    const signal = computeTrafficSignal(points, { windowDays: 7 });

    expect(signal.severity).toBe("high");
  });

  it("does not flag a traffic increase as a regression", () => {
    const previousWindow = [10, 10, 10, 10, 10, 10, 10];
    const currentWindow = [20, 20, 20, 20, 20, 20, 20];
    const points = buildPoints([...previousWindow, ...currentWindow], 5);
    const signal = computeTrafficSignal(points, { windowDays: 7, minPreviousClicks: 20 });

    expect(signal.severity).toBe("none");
    expect(signal.clicksDropRatio).toBe(0);
  });

  it("reports the average position before and after the window split", () => {
    const previousDays: DailyMetricPoint[] = Array.from({ length: 7 }, (_, index) => ({
      date: `2026-08-${String(index + 1).padStart(2, "0")}`,
      clicks: 20,
      position: 4
    }));
    const currentDays: DailyMetricPoint[] = Array.from({ length: 7 }, (_, index) => ({
      date: `2026-08-${String(index + 8).padStart(2, "0")}`,
      clicks: 10,
      position: 8
    }));
    const signal = computeTrafficSignal([...previousDays, ...currentDays], { windowDays: 7 });

    expect(signal.positionBefore).toBeCloseTo(4, 5);
    expect(signal.positionAfter).toBeCloseTo(8, 5);
  });
});

function rows(entries: Array<[clicks: number, position: number]>): PageInsightRow[] {
  return entries.map(([clicks, position]) => ({ clicks, position }));
}

describe("computePageTrafficSignal", () => {
  it("is scoped to \"page\" and returns no signal below the minimum baseline clicks", () => {
    const signal = computePageTrafficSignal(rows([[5, 4]]), rows([[10, 4]]), {
      minPreviousClicks: 20
    });

    expect(signal).toEqual({
      severity: "none",
      clicksDelta: 0,
      clicksDropRatio: 0,
      positionBefore: null,
      positionAfter: null,
      scope: "page"
    });
  });

  it("sums clicks across multiple query rows for the same page", () => {
    const baseline = rows([
      [30, 3],
      [20, 5]
    ]); // 50 clicks total
    const current = rows([
      [10, 6],
      [5, 9]
    ]); // 15 clicks total, 70% drop

    const signal = computePageTrafficSignal(current, baseline);

    expect(signal.severity).toBe("high");
    expect(signal.clicksDelta).toBe(-35);
    expect(signal.clicksDropRatio).toBeCloseTo(0.7, 2);
    expect(signal.scope).toBe("page");
  });

  it("weights the average position by clicks per query row", () => {
    const baseline = rows([
      [30, 2],
      [10, 10]
    ]); // weighted: (30*2 + 10*10) / 40 = 4
    const current = rows([
      [5, 8],
      [5, 12]
    ]); // weighted: (5*8 + 5*12) / 10 = 10

    const signal = computePageTrafficSignal(current, baseline, { minPreviousClicks: 20 });

    expect(signal.positionBefore).toBeCloseTo(4, 5);
    expect(signal.positionAfter).toBeCloseTo(10, 5);
  });

  it("does not flag a page whose clicks improved", () => {
    const signal = computePageTrafficSignal(rows([[40, 3]]), rows([[20, 5]]), {
      minPreviousClicks: 10
    });

    expect(signal.severity).toBe("none");
    expect(signal.clicksDropRatio).toBe(0);
  });
});
