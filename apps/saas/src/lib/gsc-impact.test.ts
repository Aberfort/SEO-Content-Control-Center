import { describe, expect, it } from "vitest";

import {
  attachSearchImpact,
  buildSearchImpactAssessments,
  compareIssuesBySearchImpact,
  compareTasksBySearchImpact,
  preserveSearchImpactBaseline,
  readSearchImpact,
  readSearchImpactBandFromTags,
  withSearchImpactTag
} from "./gsc-impact";
import type { AuditIssue, GscSearchInsight } from "./types";

function insight(overrides: Partial<GscSearchInsight> = {}): GscSearchInsight {
  return {
    id: "insight-1",
    siteId: "site-1",
    propertyUrl: "sc-domain:example.com",
    startDate: "2026-08-01",
    endDate: "2026-08-07",
    page: "https://example.com/guide/",
    query: "example guide",
    clicks: 60,
    impressions: 1200,
    ctr: 0.05,
    position: 6,
    syncedAt: "2026-08-08T00:00:00.000Z",
    ...overrides
  };
}

function issue(evidence: unknown = {}): AuditIssue {
  return {
    id: "issue-1",
    auditId: "audit-1",
    organizationId: "org-1",
    siteId: "site-1",
    issueType: "synced_content.seo-title-missing",
    status: "OPEN",
    severity: "MEDIUM",
    affectedUrl: "https://example.com/guide/",
    evidence,
    explanation: "Missing title",
    recommendedAction: "Add title",
    potentialImpact: null,
    fingerprint: "issue:1",
    createdAt: "2026-08-08T00:00:00.000Z",
    updatedAt: "2026-08-08T00:00:00.000Z"
  };
}

describe("buildSearchImpactAssessments", () => {
  it("classifies visibility with transparent thresholds and compares adjacent periods", () => {
    const assessments = buildSearchImpactAssessments({
      currentInsights: [insight()],
      comparisonInsights: [
        insight({
          id: "baseline-1",
          startDate: "2026-07-25",
          endDate: "2026-07-31",
          clicks: 40,
          impressions: 1000,
          ctr: 0.04,
          position: 7
        })
      ],
      contentEntries: [
        {
          id: "content-1",
          externalId: "post:1",
          url: "https://www.example.com/guide",
          title: "Guide"
        }
      ]
    });

    expect(assessments.get("post:1")).toMatchObject({
      band: "high",
      thresholds: {
        mediumClicks: 10,
        mediumImpressions: 200,
        highClicks: 50,
        highImpressions: 1000
      },
      current: {
        clicks: 60,
        impressions: 1200,
        ctr: 0.05,
        position: 6
      },
      comparison: {
        clicks: 40,
        impressions: 1000
      },
      trackingBaseline: { clicks: 60, impressions: 1200 },
      outcome: { status: "awaiting_followup" }
    });
  });

  it("uses medium, low, and awaiting-followup states deterministically", () => {
    const medium = buildSearchImpactAssessments({
      currentInsights: [insight({ clicks: 9, impressions: 250 })],
      comparisonInsights: [],
      contentEntries: [
        { id: "content-1", externalId: "post:1", url: "https://example.com/guide", title: null }
      ]
    }).get("post:1");
    const low = buildSearchImpactAssessments({
      currentInsights: [insight({ clicks: 1, impressions: 20 })],
      comparisonInsights: [],
      contentEntries: [
        { id: "content-1", externalId: "post:1", url: "https://example.com/guide", title: null }
      ]
    }).get("post:1");

    expect(medium?.band).toBe("medium");
    expect(medium?.outcome.status).toBe("awaiting_followup");
    expect(low?.band).toBe("low");
  });
});

describe("search impact issue enrichment", () => {
  it("embeds readable impact evidence and sorts higher impact first", () => {
    const impacts = buildSearchImpactAssessments({
      currentInsights: [insight()],
      comparisonInsights: [],
      contentEntries: [
        { id: "content-1", externalId: "post:1", url: "https://example.com/guide", title: null }
      ]
    });
    const enriched = attachSearchImpact(issue(), impacts.get("post:1"));

    expect(readSearchImpact(enriched.evidence)?.band).toBe("high");
    expect(enriched.potentialImpact).toContain("HIGH search impact");
    expect(compareIssuesBySearchImpact(enriched, issue())).toBeLessThan(0);
  });

  it("preserves the first tracked window and reports later movement without claiming causality", () => {
    const contentEntries = [
      {
        id: "content-1",
        externalId: "post:1",
        url: "https://example.com/guide",
        title: null
      }
    ];
    const baselineImpact = buildSearchImpactAssessments({
      currentInsights: [insight({ clicks: 40, impressions: 1000 })],
      comparisonInsights: [],
      contentEntries
    }).get("post:1");
    const followupImpact = buildSearchImpactAssessments({
      currentInsights: [
        insight({
          startDate: "2026-08-08",
          endDate: "2026-08-14",
          clicks: 60,
          impressions: 1200
        })
      ],
      comparisonInsights: [],
      contentEntries
    }).get("post:1");
    const baselineIssue = attachSearchImpact(issue(), baselineImpact);
    const followupIssue = preserveSearchImpactBaseline(
      attachSearchImpact(issue(), followupImpact),
      baselineIssue.evidence
    );

    expect(readSearchImpact(followupIssue.evidence)).toMatchObject({
      trackingBaseline: { clicks: 40, impressions: 1000 },
      current: { clicks: 60, impressions: 1200 },
      outcome: {
        status: "improved",
        clicksDelta: 20,
        clicksDeltaRatio: 0.5,
        impressionsDelta: 200,
        disclaimer: "Period comparison shows correlation, not causation."
      }
    });
  });
});

describe("search impact backlog priority", () => {
  it("persists a replaceable impact tag and sorts higher-impact work first", () => {
    const highEvidence = attachSearchImpact(
      issue(),
      buildSearchImpactAssessments({
        currentInsights: [insight()],
        comparisonInsights: [],
        contentEntries: [
          { id: "content-1", externalId: "post:1", url: "https://example.com/guide", title: null }
        ]
      }).get("post:1")
    ).evidence;
    const tags = withSearchImpactTag(["audit", "search-impact:low"], highEvidence);

    expect(tags).toEqual(["audit", "search-impact:high"]);
    expect(readSearchImpactBandFromTags(tags)).toBe("high");
    expect(compareTasksBySearchImpact({ tags }, { tags: ["audit"] })).toBeLessThan(0);
  });
});
