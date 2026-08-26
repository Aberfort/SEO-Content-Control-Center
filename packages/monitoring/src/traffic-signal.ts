export type DailyMetricPoint = {
  date: string;
  clicks: number;
  position: number | null;
};

export type TrafficSignalSeverity = "none" | "medium" | "high";

export type TrafficSignal = {
  severity: TrafficSignalSeverity;
  clicksDelta: number;
  clicksDropRatio: number;
  positionBefore: number | null;
  positionAfter: number | null;
};

export type TrafficSignalOptions = {
  windowDays?: number;
  minPreviousClicks?: number;
  mediumDropRatio?: number;
  highDropRatio?: number;
};

const defaultWindowDays = 7;
const defaultMinPreviousClicks = 20;
const defaultMediumDropRatio = 0.25;
const defaultHighDropRatio = 0.5;

const noSignal: TrafficSignal = {
  severity: "none",
  clicksDelta: 0,
  clicksDropRatio: 0,
  positionBefore: null,
  positionAfter: null
};

/**
 * Compares the most recent N-day window of daily click/position points
 * against the N days directly before it. Deterministic: severity comes from
 * the click-drop ratio, gated by a minimum previous-window click volume so
 * low-traffic pages/sites do not produce noisy signals.
 */
export function computeTrafficSignal(
  points: DailyMetricPoint[],
  options: TrafficSignalOptions = {}
): TrafficSignal {
  const windowDays = options.windowDays ?? defaultWindowDays;
  const minPreviousClicks = options.minPreviousClicks ?? defaultMinPreviousClicks;
  const mediumDropRatio = options.mediumDropRatio ?? defaultMediumDropRatio;
  const highDropRatio = options.highDropRatio ?? defaultHighDropRatio;
  const sorted = [...points].sort((left, right) => left.date.localeCompare(right.date));

  if (sorted.length < windowDays * 2) {
    return noSignal;
  }

  const currentWindow = sorted.slice(sorted.length - windowDays);
  const previousWindow = sorted.slice(sorted.length - windowDays * 2, sorted.length - windowDays);
  const currentClicks = sumClicks(currentWindow);
  const previousClicks = sumClicks(previousWindow);

  if (previousClicks < minPreviousClicks) {
    return noSignal;
  }

  const clicksDelta = currentClicks - previousClicks;
  const clicksDropRatio = clicksDelta < 0 ? Math.abs(clicksDelta) / previousClicks : 0;
  const severity: TrafficSignalSeverity =
    clicksDropRatio >= highDropRatio ? "high" : clicksDropRatio >= mediumDropRatio ? "medium" : "none";

  return {
    severity,
    clicksDelta,
    clicksDropRatio,
    positionBefore: averagePosition(previousWindow),
    positionAfter: averagePosition(currentWindow)
  };
}

function sumClicks(points: DailyMetricPoint[]): number {
  return points.reduce((total, point) => total + point.clicks, 0);
}

function averagePosition(points: DailyMetricPoint[]): number | null {
  const withPosition = points.filter(
    (point): point is DailyMetricPoint & { position: number } => point.position !== null
  );

  if (withPosition.length === 0) {
    return null;
  }

  return withPosition.reduce((total, point) => total + point.position, 0) / withPosition.length;
}
