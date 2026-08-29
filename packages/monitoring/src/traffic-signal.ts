export type DailyMetricPoint = {
  date: string;
  clicks: number;
  position: number | null;
};

export type PageInsightRow = {
  clicks: number;
  position: number;
};

export type TrafficSignalSeverity = "none" | "medium" | "high";

export type TrafficSignal = {
  severity: TrafficSignalSeverity;
  clicksDelta: number;
  clicksDropRatio: number;
  positionBefore: number | null;
  positionAfter: number | null;
  /**
   * Whether this signal was computed from the specific monitored URL's own
   * Search Console page-level insights ("page") or, when no page-level
   * history was available yet, from the site's aggregate daily metrics
   * ("site") as a less precise fallback.
   */
  scope: "page" | "site";
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
  const sorted = [...points].sort((left, right) => left.date.localeCompare(right.date));

  if (sorted.length < windowDays * 2) {
    return noSignal("site");
  }

  const currentWindow = sorted.slice(sorted.length - windowDays);
  const previousWindow = sorted.slice(sorted.length - windowDays * 2, sorted.length - windowDays);
  const currentClicks = sumClicks(currentWindow);
  const previousClicks = sumClicks(previousWindow);

  if (previousClicks < minPreviousClicks) {
    return noSignal("site");
  }

  return buildSignal(currentClicks, previousClicks, averagePosition(previousWindow), averagePosition(currentWindow), "site", options);
}

/**
 * Compares Search Console insight rows for one specific page across two
 * date ranges (typically "current" vs. "7 days earlier"), aggregating
 * across the per-query rows Search Console returns for that page. This is
 * the precise, page-scoped counterpart to computeTrafficSignal's site-wide
 * aggregate — callers should match GscSearchInsight rows to the monitored
 * URL (see normalizeUrl) before passing them in here.
 */
export function computePageTrafficSignal(
  currentRows: PageInsightRow[],
  baselineRows: PageInsightRow[],
  options: TrafficSignalOptions = {}
): TrafficSignal {
  const minPreviousClicks = options.minPreviousClicks ?? defaultMinPreviousClicks;
  const currentClicks = sumRowClicks(currentRows);
  const previousClicks = sumRowClicks(baselineRows);

  if (previousClicks < minPreviousClicks) {
    return noSignal("page");
  }

  return buildSignal(
    currentClicks,
    previousClicks,
    averageRowPosition(baselineRows),
    averageRowPosition(currentRows),
    "page",
    options
  );
}

function buildSignal(
  currentClicks: number,
  previousClicks: number,
  positionBefore: number | null,
  positionAfter: number | null,
  scope: "page" | "site",
  options: TrafficSignalOptions
): TrafficSignal {
  const mediumDropRatio = options.mediumDropRatio ?? defaultMediumDropRatio;
  const highDropRatio = options.highDropRatio ?? defaultHighDropRatio;
  const clicksDelta = currentClicks - previousClicks;
  const clicksDropRatio = clicksDelta < 0 ? Math.abs(clicksDelta) / previousClicks : 0;
  const severity: TrafficSignalSeverity =
    clicksDropRatio >= highDropRatio ? "high" : clicksDropRatio >= mediumDropRatio ? "medium" : "none";

  return {
    severity,
    clicksDelta,
    clicksDropRatio,
    positionBefore,
    positionAfter,
    scope
  };
}

function noSignal(scope: "page" | "site"): TrafficSignal {
  return {
    severity: "none",
    clicksDelta: 0,
    clicksDropRatio: 0,
    positionBefore: null,
    positionAfter: null,
    scope
  };
}

function sumClicks(points: DailyMetricPoint[]): number {
  return points.reduce((total, point) => total + point.clicks, 0);
}

function sumRowClicks(rows: PageInsightRow[]): number {
  return rows.reduce((total, row) => total + row.clicks, 0);
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

function averageRowPosition(rows: PageInsightRow[]): number | null {
  if (rows.length === 0) {
    return null;
  }

  const totalClicks = sumRowClicks(rows);

  if (totalClicks > 0) {
    return rows.reduce((total, row) => total + row.position * row.clicks, 0) / totalClicks;
  }

  return rows.reduce((total, row) => total + row.position, 0) / rows.length;
}
