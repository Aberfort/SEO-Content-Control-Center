import { describe, expect, it } from "vitest";

import {
  detectRegressions,
  type RegressionEngineEvent,
  type RegressionEngineInput
} from "../src/regression-engine";
import type { TrafficSignal } from "../src/traffic-signal";

const noTraffic: TrafficSignal = {
  severity: "none",
  clicksDelta: 0,
  clicksDropRatio: 0,
  positionBefore: null,
  positionAfter: null,
  scope: "site"
};

function event(overrides: Partial<RegressionEngineEvent> = {}): RegressionEngineEvent {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    type: "title_changed",
    severity: "INFO",
    title: "Title tag changed",
    occurredAt: "2026-08-26T10:00:00.000Z",
    ...overrides
  };
}

function detect(
  input: Pick<RegressionEngineInput, "monitoredUrlId" | "events"> &
    Partial<Pick<RegressionEngineInput, "siteTraffic" | "recentWordPressEvents">>
) {
  return detectRegressions({
    siteTraffic: noTraffic,
    recentWordPressEvents: [],
    ...input
  });
}

describe("detectRegressions", () => {
  it("returns no candidates when nothing matches any rule", () => {
    expect(detect({ monitoredUrlId: "url-1", events: [event()] })).toEqual([]);
  });

  it("flags a page becoming noindex as an immediate critical regression", () => {
    const noindexEvent = event({ id: "evt-noindex", type: "page_became_noindex", severity: "CRITICAL" });
    const result = detect({ monitoredUrlId: "url-1", events: [noindexEvent] });

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
    const result = detect({ monitoredUrlId: "url-1", events: [notFoundEvent] });

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
    const result = detect({ monitoredUrlId: "url-1", events: [ga4Event, gtmEvent] });

    expect(result).toEqual([
      expect.objectContaining({
        title: "Tracking regression: GA4 and GTM disappeared",
        eventIds: ["evt-ga4", "evt-gtm"]
      })
    ]);
  });

  it("does not flag a canonical change without a corresponding traffic decline", () => {
    const canonicalEvent = event({ id: "evt-canonical", type: "canonical_changed", severity: "CRITICAL" });
    const result = detect({ monitoredUrlId: "url-1", events: [canonicalEvent] });

    expect(result).toEqual([]);
  });

  it("flags a canonical change correlated with a traffic decline as a possible SEO regression", () => {
    const canonicalEvent = event({ id: "evt-canonical", type: "canonical_changed", severity: "CRITICAL" });
    const decliningTraffic: TrafficSignal = {
      severity: "high",
      clicksDelta: -320,
      clicksDropRatio: 0.62,
      positionBefore: 4.3,
      positionAfter: 8.1,
      scope: "site"
    };

    const result = detect({
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
    expect(result[0]?.summary).toContain("site-wide Search Console clicks");
  });

  it("describes the traffic decline as page-specific when the signal is page-scoped", () => {
    const canonicalEvent = event({ id: "evt-canonical", type: "canonical_changed", severity: "CRITICAL" });
    const pageTraffic: TrafficSignal = {
      severity: "high",
      clicksDelta: -80,
      clicksDropRatio: 0.55,
      positionBefore: 3.1,
      positionAfter: 7.4,
      scope: "page"
    };

    const result = detect({
      monitoredUrlId: "url-1",
      events: [canonicalEvent],
      siteTraffic: pageTraffic
    });

    expect(result[0]?.summary).toContain("this page's Search Console clicks");
    expect(result[0]?.summary).not.toContain("site-wide");
  });

  it("uses WARNING severity for a medium traffic decline and CRITICAL for a high one", () => {
    const canonicalEvent = event({ id: "evt-canonical", type: "canonical_changed" });
    const medium = detect({
      monitoredUrlId: "url-1",
      events: [canonicalEvent],
      siteTraffic: { ...noTraffic, severity: "medium", clicksDropRatio: 0.3 }
    });
    const high = detect({
      monitoredUrlId: "url-1",
      events: [canonicalEvent],
      siteTraffic: { ...noTraffic, severity: "high", clicksDropRatio: 0.6 }
    });

    expect(medium[0]?.severity).toBe("WARNING");
    expect(high[0]?.severity).toBe("CRITICAL");
  });

  it("can return multiple independent candidates from a single scan", () => {
    const result = detect({
      monitoredUrlId: "url-1",
      events: [
        event({ id: "evt-404", type: "page_became_404" }),
        event({ id: "evt-ga4", type: "ga4_missing" })
      ]
    });

    expect(result).toHaveLength(2);
    expect(result.map((candidate) => candidate.title).sort()).toEqual([
      "Page started returning HTTP 404",
      "Tracking regression: GA4 disappeared"
    ]);
  });

  it("links a preceding WordPress plugin update to a following canonical change", () => {
    const pluginUpdateEvent = event({
      id: "evt-plugin-update",
      type: "plugin_updated",
      title: "Yoast SEO updated from 25.1 to 25.2",
      occurredAt: "2026-08-24T08:00:00.000Z"
    });
    const canonicalEvent = event({
      id: "evt-canonical",
      type: "canonical_changed",
      severity: "CRITICAL",
      title: "Canonical URL changed",
      occurredAt: "2026-08-26T08:00:00.000Z"
    });

    const result = detect({
      monitoredUrlId: "url-1",
      events: [canonicalEvent],
      recentWordPressEvents: [pluginUpdateEvent]
    });

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fingerprint: "url-1:wordpress_change:evt-plugin-update:evt-canonical",
          severity: "CRITICAL",
          title: "Possible SEO regression",
          eventIds: ["evt-plugin-update", "evt-canonical"]
        })
      ])
    );
    const wordPressCandidate = result.find((candidate) => candidate.fingerprint.includes("wordpress_change"));
    expect(wordPressCandidate?.summary).toContain("Yoast SEO updated from 25.1 to 25.2");
    expect(wordPressCandidate?.summary).toContain("possible cause, not confirmed causation");
  });

  it("does not link a WordPress event that happened after the regression", () => {
    const pluginUpdateEvent = event({
      id: "evt-plugin-update",
      type: "plugin_updated",
      occurredAt: "2026-08-27T08:00:00.000Z"
    });
    const canonicalEvent = event({
      id: "evt-canonical",
      type: "canonical_changed",
      occurredAt: "2026-08-26T08:00:00.000Z"
    });

    const result = detect({
      monitoredUrlId: "url-1",
      events: [canonicalEvent],
      recentWordPressEvents: [pluginUpdateEvent]
    });

    expect(result.some((candidate) => candidate.fingerprint.includes("wordpress_change"))).toBe(false);
  });

  it("picks the most recent preceding WordPress event when several are in range", () => {
    const olderUpdate = event({
      id: "evt-older",
      type: "plugin_activated",
      occurredAt: "2026-08-23T08:00:00.000Z"
    });
    const newerUpdate = event({
      id: "evt-newer",
      type: "plugin_updated",
      occurredAt: "2026-08-25T08:00:00.000Z"
    });
    const notFoundEvent = event({
      id: "evt-404",
      type: "page_became_404",
      occurredAt: "2026-08-26T08:00:00.000Z"
    });

    const result = detect({
      monitoredUrlId: "url-1",
      events: [notFoundEvent],
      recentWordPressEvents: [olderUpdate, newerUpdate]
    });

    const wordPressCandidate = result.find((candidate) => candidate.fingerprint.includes("wordpress_change"));
    expect(wordPressCandidate?.eventIds).toEqual(["evt-newer", "evt-404"]);
  });
});
