import { describe, expect, it } from "vitest";

import { computeTrafficSignal, type DailyMetricPoint } from "../src/traffic-signal";

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
      positionAfter: null
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
