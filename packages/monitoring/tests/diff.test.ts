import { describe, expect, it } from "vitest";

import { diffSnapshots } from "../src/diff";
import type { SnapshotFields } from "../src/types";

function baseline(overrides: Partial<SnapshotFields> = {}): SnapshotFields {
  return {
    httpStatus: 200,
    finalUrl: "https://example.com/page/",
    responseTimeMs: 300,
    title: "Best Online Casinos 2026",
    metaDescription: "A description.",
    h1: "Best Online Casinos",
    canonical: "https://example.com/page/",
    metaRobots: "index,follow",
    xRobotsTag: null,
    hasStructuredData: true,
    hasGa4: true,
    hasGtm: true,
    contentHash: "hash-a",
    htmlHash: "html-a",
    ...overrides
  };
}

describe("diffSnapshots", () => {
  it("returns no events for a baseline snapshot (no previous)", () => {
    expect(diffSnapshots(null, baseline())).toEqual([]);
  });

  it("returns no events when nothing changed", () => {
    expect(diffSnapshots(baseline(), baseline())).toEqual([]);
  });

  it("detects a critical canonical change", () => {
    const events = diffSnapshots(
      baseline(),
      baseline({ canonical: "https://example.com/other-page/" })
    );

    expect(events).toEqual([
      {
        type: "canonical_changed",
        severity: "CRITICAL",
        title: "Canonical URL changed",
        oldValue: "https://example.com/page/",
        newValue: "https://example.com/other-page/"
      }
    ]);
  });

  it("detects a page becoming noindex via meta robots as critical", () => {
    const events = diffSnapshots(baseline(), baseline({ metaRobots: "noindex,follow" }));

    expect(events).toEqual([
      expect.objectContaining({
        type: "page_became_noindex",
        severity: "CRITICAL"
      })
    ]);
  });

  it("does not flag noindex when it was already noindex", () => {
    const events = diffSnapshots(
      baseline({ metaRobots: "noindex,follow" }),
      baseline({ metaRobots: "noindex,nofollow" })
    );

    expect(events).toEqual([
      expect.objectContaining({
        type: "robots_changed",
        severity: "WARNING"
      })
    ]);
  });

  it("detects a 200 to 404 transition as critical page_became_404", () => {
    const events = diffSnapshots(baseline(), baseline({ httpStatus: 404 }));

    expect(events).toEqual([
      expect.objectContaining({
        type: "page_became_404",
        severity: "CRITICAL",
        oldValue: 200,
        newValue: 404
      })
    ]);
  });

  it("detects GA4 and GTM disappearing as critical events", () => {
    const events = diffSnapshots(baseline(), baseline({ hasGa4: false, hasGtm: false }));

    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "ga4_missing", severity: "CRITICAL" }),
        expect.objectContaining({ type: "gtm_missing", severity: "CRITICAL" })
      ])
    );
    expect(events).toHaveLength(2);
  });

  it("detects structured data removal as a warning", () => {
    const events = diffSnapshots(baseline(), baseline({ hasStructuredData: false }));

    expect(events).toEqual([
      expect.objectContaining({ type: "schema_removed", severity: "WARNING" })
    ]);
  });

  it("detects significant response time degradation only above the threshold", () => {
    const smallChange = diffSnapshots(baseline({ responseTimeMs: 300 }), baseline({ responseTimeMs: 400 }));
    expect(smallChange).toEqual([]);

    const bigChange = diffSnapshots(baseline({ responseTimeMs: 300 }), baseline({ responseTimeMs: 900 }));
    expect(bigChange).toEqual([
      expect.objectContaining({ type: "response_time_degraded", severity: "WARNING" })
    ]);
  });

  it("detects content changes via content hash without flagging unrelated fields", () => {
    const events = diffSnapshots(baseline(), baseline({ contentHash: "hash-b" }));

    expect(events).toEqual([
      expect.objectContaining({ type: "content_changed", oldValue: "hash-a", newValue: "hash-b" })
    ]);
  });

  it("does not attribute a traffic-unrelated field change to a regression (no false positives)", () => {
    // A response time fluctuation below the threshold, with nothing else changing,
    // must not produce any event — this guards against noisy/false-positive alerts.
    const events = diffSnapshots(baseline({ responseTimeMs: 280 }), baseline({ responseTimeMs: 310 }));
    expect(events).toEqual([]);
  });
});
