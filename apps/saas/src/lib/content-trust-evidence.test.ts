import { describe, expect, it } from "vitest";

import {
  buildContentTrustBacklogCandidates,
  buildContentTrustEvidence
} from "./content-trust-evidence";
import type { SyncedContentItem } from "./types";

describe("buildContentTrustEvidence", () => {
  it("keeps detailed evidence locked on Trial", () => {
    const result = buildContentTrustEvidence({ item: buildItem(), planCode: "TRIAL" });

    expect(result.access).toEqual({
      allowed: false,
      planCode: "TRIAL",
      minimumPlan: "STARTER",
      reason: "Content Trust Evidence is available on Starter and higher plans."
    });
    expect(result.dimensions).toEqual([]);
    expect(result.summary).toEqual({
      present: 0,
      missing: 0,
      insufficient: 0,
      human_review: 0
    });
    expect(buildContentTrustBacklogCandidates(result)).toEqual([]);
  });

  it("organizes transparent Starter evidence without producing a score", () => {
    const result = buildContentTrustEvidence({ item: buildItem(), planCode: "STARTER" });

    expect(result.access.allowed).toBe(true);
    expect(result.dimensions.map((dimension) => dimension.dimension)).toEqual([
      "experience",
      "expertise",
      "authoritativeness",
      "trust"
    ]);
    expect(result.dimensions[0]?.signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "original-media", status: "present" }),
        expect.objectContaining({ id: "first-hand-demonstration", status: "human_review" })
      ])
    );
    expect(result.dimensions[3]?.signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "secure-delivery", status: "present" }),
        expect.objectContaining({
          id: "heightened-risk-review",
          status: "human_review",
          evidence: expect.stringContaining("finance")
        })
      ])
    );
    expect(result.methodology.statements.join(" ")).toContain("not a Google score");
    expect(result).not.toHaveProperty("score");
    expect(buildContentTrustBacklogCandidates(result)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "content-trust:trust:heightened-risk-review",
          priority: "high",
          sourceSignalId: "content-trust.trust.heightened-risk-review"
        })
      ])
    );
  });

  it("marks absent observable evidence explicitly", () => {
    const result = buildContentTrustEvidence({
      item: buildItem({
        url: "http://example.com/guide",
        metadata: {
          wordCount: 120,
          externalLinkCount: 0,
          featuredImagePresent: false
        }
      }),
      planCode: "PRO"
    });
    const signals = result.dimensions.flatMap((dimension) => dimension.signals);

    expect(signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "named-author", status: "missing" }),
        expect.objectContaining({ id: "supporting-sources", status: "missing" }),
        expect.objectContaining({ id: "secure-delivery", status: "missing" })
      ])
    );
    expect(result.summary.missing).toBeGreaterThan(0);
  });
});

function buildItem(overrides: Partial<SyncedContentItem> = {}): SyncedContentItem {
  return {
    id: "content-1",
    organizationId: "organization-1",
    siteId: "site-1",
    externalId: "post:42",
    type: "post",
    url: "https://example.com/guide",
    title: "A practical finance guide",
    status: "publish",
    modifiedAt: "2026-08-15T08:00:00.000Z",
    metadata: {
      authorId: 7,
      authorName: "Alex Expert",
      publishedAt: "2026-07-01T08:00:00.000Z",
      featuredImagePresent: true,
      featuredImageUrl: "https://example.com/guide.jpg",
      wordCount: 1200,
      externalLinkCount: 3,
      canonicalUrl: "https://example.com/guide/",
      taxonomies: [{ taxonomy: "category", terms: ["finance"] }]
    },
    firstSeenAt: "2026-08-01T08:00:00.000Z",
    lastSeenAt: "2026-08-15T08:00:00.000Z",
    ...overrides
  };
}
