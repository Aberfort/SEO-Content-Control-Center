import { describe, expect, it } from "vitest";

import { detectRegressions, type RegressionEngineEvent } from "../src/regression-engine";
import type { TrafficSignal } from "../src/traffic-signal";

const noTraffic: TrafficSignal = {
  severity: "none",
  clicksDelta: 0,
  clicksDropRatio: 0,
  positionBefore: null,
  positionAfter: null
};

function event(overrides: Partial<RegressionEngineEvent> = {}): RegressionEngineEvent {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    type: "title_changed",
    severity: "INFO",
    title: "Title tag changed",
    ...overrides
  };
}

describe("detectRegressions", () => {
  it("returns no candidates when nothing matches any rule", () => {
    const result = detectRegressions({
      monitoredUrlId: "url-1",
      events: [event()],
      siteTraffic: noTraffic
    });

    expect(result).toEqual([]);
  });

  it("flags a page becoming noindex as an immediate critical regression", () => {
    const noindexEvent = event({ id: "evt-noindex", type: "page_became_noindex", severity: "CRITICAL" });
    const result = detectRegressions({
      monitoredUrlId: "url-1",
      events: [noindexEvent],
      siteTraffic: noTraffic
    });

    expect(result).toEqual([
      expect.objectContaining({
        fingerprint: "url-1:noindex:evt-noindex",
        severity: "CRITICAL",
        title: "Page became noindex",
        eventIds: ["evt-noindex"]
      })
    ]);
  });

  it("flags an HTTP 200 to 404 transition as an immediate critical regression", () => {
    const notFoundEvent = event({ id: "evt-404", type: "page_became_404", severity: "CRITICAL" });
    const result = detectRegressions({
      monitoredUrlId: "url-1",
      events: [notFoundEvent],
      siteTraffic: noTraffic
    });

    expect(result).toEqual([
      expect.objectContaining({
        fingerprint: "url-1:not_found:evt-404",
        severity: "CRITICAL"
      })
    ]);
  });

  it("flags GA4 and GTM disappearing together as one tracking regression", () => {
    const ga4Event = event({ id: "evt-ga4", type: "ga4_missing", severity: "CRITICAL" });
    const gtmEvent = event({ id: "evt-gtm", type: "gtm_missing", severity: "CRITICAL" });
    const result = detectRegressions({
      monitoredUrlId: "url-1",
      events: [ga4Event, gtmEvent],
      siteTraffic: noTraffic
    });

    expect(result).toEqual([
      expect.objectContaining({
        title: "Tracking regression: GA4 and GTM disappeared",
        eventIds: ["evt-ga4", "evt-gtm"]
      })
    ]);
  });

  it("does not flag a canonical change without a corresponding traffic decline", () => {
    const canonicalEvent = event({ id: "evt-canonical", type: "canonical_changed", severity: "CRITICAL" });
    const result = detectRegressions({
      monitoredUrlId: "url-1",
      events: [canonicalEvent],
      siteTraffic: noTraffic
    });

    expect(result).toEqual([]);
  });

  it("flags a canonical change correlated with a traffic decline as a possible SEO regression", () => {
    const canonicalEvent = event({ id: "evt-canonical", type: "canonical_changed", severity: "CRITICAL" });
    const decliningTraffic: TrafficSignal = {
      severity: "high",
      clicksDelta: -320,
      clicksDropRatio: 0.62,
      positionBefore: 4.3,
      positionAfter: 8.1
    };

    const result = detectRegressions({
      monitoredUrlId: "url-1",
      events: [canonicalEvent],
      siteTraffic: decliningTraffic
    });

    expect(result).toEqual([
      expect.objectContaining({
        severity: "CRITICAL",
        title: "Possible SEO regression",
        eventIds: ["evt-canonical"],
        metrics: {
          clicksDelta: -320,
          clicksDropRatio: 0.62,
          positionBefore: 4.3,
          positionAfter: 8.1
        }
      })
    ]);
    expect(result[0]?.summary).toContain("possible cause, not confirmed causation");
  });

  it("uses WARNING severity for a medium traffic decline and CRITICAL for a high one", () => {
    const canonicalEvent = event({ id: "evt-canonical", type: "canonical_changed" });
    const medium = detectRegressions({
      monitoredUrlId: "url-1",
      events: [canonicalEvent],
      siteTraffic: { ...noTraffic, severity: "medium", clicksDropRatio: 0.3 }
    });
    const high = detectRegressions({
      monitoredUrlId: "url-1",
      events: [canonicalEvent],
      siteTraffic: { ...noTraffic, severity: "high", clicksDropRatio: 0.6 }
    });

    expect(medium[0]?.severity).toBe("WARNING");
    expect(high[0]?.severity).toBe("CRITICAL");
  });

  it("can return multiple independent candidates from a single scan", () => {
    const result = detectRegressions({
      monitoredUrlId: "url-1",
      events: [
        event({ id: "evt-404", type: "page_became_404" }),
        event({ id: "evt-ga4", type: "ga4_missing" })
      ],
      siteTraffic: noTraffic
    });

    expect(result).toHaveLength(2);
    expect(result.map((candidate) => candidate.title).sort()).toEqual([
      "Page started returning HTTP 404",
      "Tracking regression: GA4 disappeared"
    ]);
  });
});
