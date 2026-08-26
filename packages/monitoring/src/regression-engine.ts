import type { EventSeverity } from "./types";
import type { TrafficSignal } from "./traffic-signal";

export type RegressionEngineEvent = {
  id: string;
  type: string;
  severity: EventSeverity;
  title: string;
};

export type RegressionEngineInput = {
  monitoredUrlId: string | null;
  events: RegressionEngineEvent[];
  siteTraffic: TrafficSignal | null;
};

export type RegressionCandidate = {
  fingerprint: string;
  severity: "WARNING" | "CRITICAL";
  title: string;
  summary: string;
  eventIds: string[];
  metrics: Record<string, unknown> | null;
};

type RegressionRule = (input: RegressionEngineInput) => RegressionCandidate | null;

const noindexRule: RegressionRule = (input) => {
  const event = input.events.find((candidate) => candidate.type === "page_became_noindex");

  if (!event) {
    return null;
  }

  return {
    fingerprint: fingerprintFor(input.monitoredUrlId, "noindex", event.id),
    severity: "CRITICAL",
    title: "Page became noindex",
    summary:
      "The page started returning a noindex directive, which can remove it from search results.",
    eventIds: [event.id],
    metrics: null
  };
};

const notFoundRule: RegressionRule = (input) => {
  const event = input.events.find((candidate) => candidate.type === "page_became_404");

  if (!event) {
    return null;
  }

  return {
    fingerprint: fingerprintFor(input.monitoredUrlId, "not_found", event.id),
    severity: "CRITICAL",
    title: "Page started returning HTTP 404",
    summary: "The monitored URL stopped responding with a successful status code.",
    eventIds: [event.id],
    metrics: null
  };
};

const trackingLostRule: RegressionRule = (input) => {
  const trackingEvents = input.events.filter(
    (candidate) => candidate.type === "ga4_missing" || candidate.type === "gtm_missing"
  );

  if (trackingEvents.length === 0) {
    return null;
  }

  const tags = [...new Set(trackingEvents.map((event) => (event.type === "ga4_missing" ? "GA4" : "GTM")))].join(
    " and "
  );

  return {
    fingerprint: fingerprintFor(
      input.monitoredUrlId,
      "tracking_lost",
      trackingEvents
        .map((event) => event.id)
        .sort()
        .join(":")
    ),
    severity: "CRITICAL",
    title: `Tracking regression: ${tags} disappeared`,
    summary: `${tags} tracking is no longer detected on this page, which can blind analytics and conversion reporting.`,
    eventIds: trackingEvents.map((event) => event.id),
    metrics: null
  };
};

const canonicalTrafficRule: RegressionRule = (input) => {
  const event = input.events.find((candidate) => candidate.type === "canonical_changed");

  if (!event || !input.siteTraffic || input.siteTraffic.severity === "none") {
    return null;
  }

  return {
    fingerprint: fingerprintFor(input.monitoredUrlId, "canonical_traffic", event.id),
    severity: input.siteTraffic.severity === "high" ? "CRITICAL" : "WARNING",
    title: "Possible SEO regression",
    summary: `The canonical URL changed while site-wide Search Console clicks dropped ${formatPercent(input.siteTraffic.clicksDropRatio)}. The canonical change may have contributed to the decline — this is a possible cause, not confirmed causation.`,
    eventIds: [event.id],
    metrics: {
      clicksDelta: input.siteTraffic.clicksDelta,
      clicksDropRatio: input.siteTraffic.clicksDropRatio,
      positionBefore: input.siteTraffic.positionBefore,
      positionAfter: input.siteTraffic.positionAfter
    }
  };
};

/**
 * Ordered list of deterministic regression rules. Add new rules here — each
 * rule is a pure function of the newly detected events (plus an optional
 * site traffic signal) and returns at most one candidate.
 */
const rules: RegressionRule[] = [noindexRule, notFoundRule, trackingLostRule, canonicalTrafficRule];

export function detectRegressions(input: RegressionEngineInput): RegressionCandidate[] {
  return rules
    .map((rule) => rule(input))
    .filter((candidate): candidate is RegressionCandidate => candidate !== null);
}

function fingerprintFor(monitoredUrlId: string | null, rule: string, key: string): string {
  return `${monitoredUrlId ?? "site"}:${rule}:${key}`;
}

function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}
