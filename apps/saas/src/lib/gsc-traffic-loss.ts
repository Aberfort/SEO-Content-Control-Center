import type { GscDailyMetric, GscSearchInsight } from "./types";

export type TrafficLossSeverity = "none" | "medium" | "high";

export type TrafficLossWindow = {
  startDate: string;
  endDate: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number | null;
};

export type SiteTrafficLoss = {
  available: boolean;
  reason: string | null;
  current: TrafficLossWindow | null;
  previous: TrafficLossWindow | null;
  clicksDelta: number;
  clicksDropRatio: number;
  severity: TrafficLossSeverity;
};

export type PageTrafficLossEntry = {
  page: string;
  currentClicks: number;
  baselineClicks: number;
  clicksDelta: number;
  dropRatio: number;
  currentPosition: number | null;
  baselinePosition: number | null;
};

export type PageTrafficLoss = {
  available: boolean;
  reason: string | null;
  currentRange: { startDate: string; endDate: string } | null;
  baselineRange: { startDate: string; endDate: string } | null;
  drops: PageTrafficLossEntry[];
};

export type SiteTrafficLossOptions = {
  windowDays?: number;
  minPreviousClicks?: number;
  mediumDropRatio?: number;
  highDropRatio?: number;
};

export type PageTrafficLossOptions = {
  minBaselineClicks?: number;
  minDropRatio?: number;
  limit?: number;
};

const defaultWindowDays = 14;
const defaultMinPreviousClicks = 50;
const defaultMediumDropRatio = 0.25;
const defaultHighDropRatio = 0.5;
const defaultMinBaselineClicks = 10;
const defaultMinPageDropRatio = 0.25;
const defaultPageDropLimit = 10;

/**
 * Compares the most recent N-day window of property-level metrics against the
 * N days directly before it. Detection is deterministic: severities come from
 * click drop ratios with a minimum previous-window click volume so tiny sites
 * do not produce noisy alerts.
 */
export function buildSiteTrafficLoss(
  metrics: GscDailyMetric[],
  options: SiteTrafficLossOptions = {}
): SiteTrafficLoss {
  const windowDays = options.windowDays ?? defaultWindowDays;
  const minPreviousClicks = options.minPreviousClicks ?? defaultMinPreviousClicks;
  const mediumDropRatio = options.mediumDropRatio ?? defaultMediumDropRatio;
  const highDropRatio = options.highDropRatio ?? defaultHighDropRatio;
  const sorted = [...metrics].sort((left, right) => left.date.localeCompare(right.date));

  if (sorted.length === 0) {
    return unavailableSiteLoss("No Search Console daily metrics are synced yet.");
  }

  const latestDate = sorted[sorted.length - 1]!.date;
  const currentStart = shiftDateOnly(latestDate, -(windowDays - 1));
  const previousEnd = shiftDateOnly(currentStart, -1);
  const previousStart = shiftDateOnly(previousEnd, -(windowDays - 1));
  const earliestDate = sorted[0]!.date;

  if (earliestDate > previousStart) {
    return unavailableSiteLoss(
      `Not enough history for two ${windowDays}-day windows; keep daily sync running.`
    );
  }

  const current = summarizeWindow(sorted, currentStart, latestDate);
  const previous = summarizeWindow(sorted, previousStart, previousEnd);
  const clicksDelta = current.clicks - previous.clicks;
  const clicksDropRatio = previous.clicks > 0 ? Math.max(0, -clicksDelta) / previous.clicks : 0;

  let severity: TrafficLossSeverity = "none";

  if (previous.clicks >= minPreviousClicks && clicksDelta < 0) {
    if (clicksDropRatio >= highDropRatio) {
      severity = "high";
    } else if (clicksDropRatio >= mediumDropRatio) {
      severity = "medium";
    }
  }

  return {
    available: true,
    reason: null,
    current,
    previous,
    clicksDelta,
    clicksDropRatio: roundRatio(clicksDropRatio),
    severity
  };
}

/**
 * Joins the latest page/query insight snapshot with a baseline snapshot and
 * returns the pages losing the most clicks. Rows are aggregated per page
 * across queries before comparison.
 */
export function buildPageTrafficLoss(
  currentInsights: GscSearchInsight[],
  baselineInsights: GscSearchInsight[],
  options: PageTrafficLossOptions = {}
): PageTrafficLoss {
  const minBaselineClicks = options.minBaselineClicks ?? defaultMinBaselineClicks;
  const minDropRatio = options.minDropRatio ?? defaultMinPageDropRatio;
  const limit = options.limit ?? defaultPageDropLimit;

  if (currentInsights.length === 0) {
    return unavailablePageLoss("No Search Console page insights are synced yet.", null, null);
  }

  const currentRange = {
    startDate: currentInsights[0]!.startDate,
    endDate: currentInsights[0]!.endDate
  };

  if (baselineInsights.length === 0) {
    return unavailablePageLoss(
      "No baseline insight snapshot exists yet; page comparison unlocks after about a week of scheduled sync.",
      currentRange,
      null
    );
  }

  const baselineRange = {
    startDate: baselineInsights[0]!.startDate,
    endDate: baselineInsights[0]!.endDate
  };
  const currentPages = aggregateInsightsByPage(currentInsights);
  const baselinePages = aggregateInsightsByPage(baselineInsights);
  const drops: PageTrafficLossEntry[] = [];

  for (const [page, baseline] of baselinePages) {
    if (baseline.clicks < minBaselineClicks) {
      continue;
    }

    const current = currentPages.get(page) ?? {
      clicks: 0,
      impressions: 0,
      position: null
    };
    const clicksDelta = current.clicks - baseline.clicks;
    const dropRatio = baseline.clicks > 0 ? Math.max(0, -clicksDelta) / baseline.clicks : 0;

    if (clicksDelta >= 0 || dropRatio < minDropRatio) {
      continue;
    }

    drops.push({
      page,
      currentClicks: current.clicks,
      baselineClicks: baseline.clicks,
      clicksDelta,
      dropRatio: roundRatio(dropRatio),
      currentPosition: current.position,
      baselinePosition: baseline.position
    });
  }

  drops.sort((left, right) => left.clicksDelta - right.clicksDelta);

  return {
    available: true,
    reason: null,
    currentRange,
    baselineRange,
    drops: drops.slice(0, Math.max(1, limit))
  };
}

export function shiftDateOnly(date: string, days: number): string {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);

  return parsed.toISOString().slice(0, 10);
}

function summarizeWindow(
  sortedMetrics: GscDailyMetric[],
  startDate: string,
  endDate: string
): TrafficLossWindow {
  let clicks = 0;
  let impressions = 0;
  let positionWeight = 0;
  let weightedPosition = 0;

  for (const metric of sortedMetrics) {
    if (metric.date < startDate || metric.date > endDate) {
      continue;
    }

    clicks += metric.clicks;
    impressions += metric.impressions;

    if (metric.impressions > 0) {
      positionWeight += metric.impressions;
      weightedPosition += metric.position * metric.impressions;
    }
  }

  return {
    startDate,
    endDate,
    clicks: roundMetric(clicks),
    impressions: roundMetric(impressions),
    ctr: impressions > 0 ? roundRatio(clicks / impressions) : 0,
    position: positionWeight > 0 ? roundMetric(weightedPosition / positionWeight) : null
  };
}

export type PageInsightAggregate = {
  clicks: number;
  impressions: number;
  position: number | null;
};

/**
 * Aggregates page/query insight rows per page: clicks and impressions sum up
 * and position becomes an impression-weighted average. Shared by traffic loss
 * detection and opportunity detection so both read pages the same way.
 */
export function aggregateInsightsByPage(
  insights: GscSearchInsight[]
): Map<string, PageInsightAggregate> {
  const pages = new Map<string, { clicks: number; impressions: number; weighted: number }>();

  for (const insight of insights) {
    const existing = pages.get(insight.page) ?? {
      clicks: 0,
      impressions: 0,
      weighted: 0
    };
    existing.clicks += insight.clicks;
    existing.impressions += insight.impressions;
    existing.weighted += insight.position * Math.max(insight.impressions, 0);
    pages.set(insight.page, existing);
  }

  const aggregated = new Map<string, PageInsightAggregate>();

  for (const [page, value] of pages) {
    aggregated.set(page, {
      clicks: roundMetric(value.clicks),
      impressions: roundMetric(value.impressions),
      position: value.impressions > 0 ? roundMetric(value.weighted / value.impressions) : null
    });
  }

  return aggregated;
}

function unavailableSiteLoss(reason: string): SiteTrafficLoss {
  return {
    available: false,
    reason,
    current: null,
    previous: null,
    clicksDelta: 0,
    clicksDropRatio: 0,
    severity: "none"
  };
}

function unavailablePageLoss(
  reason: string,
  currentRange: { startDate: string; endDate: string } | null,
  baselineRange: { startDate: string; endDate: string } | null
): PageTrafficLoss {
  return {
    available: false,
    reason,
    currentRange,
    baselineRange,
    drops: []
  };
}

function roundMetric(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundRatio(value: number): number {
  return Math.round(value * 10000) / 10000;
}
