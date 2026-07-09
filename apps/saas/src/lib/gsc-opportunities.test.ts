import { describe, expect, it } from "vitest";

import {
  buildGscOpportunities,
  buildGscOpportunityBacklogCandidates,
  buildGscOpportunityCandidateId,
  expectedCtrForPosition,
  matchGscOpportunityEntries,
  type GscOpportunityEntry,
  type MatchedGscOpportunityEntry
} from "./gsc-opportunities";
import type { GscSearchInsight } from "./types";

const range = { startDate: "2026-06-22", endDate: "2026-06-28" };

function insight(input: {
  page: string;
  clicks: number;
  impressions: number;
  position: number;
  query?: string;
}): GscSearchInsight {
  return {
    id: `insight-${input.page}-${input.query ?? "query"}`,
    siteId: "22222222-2222-4222-8222-222222222222",
    propertyUrl: "sc-domain:example.com",
    startDate: range.startDate,
    endDate: range.endDate,
    page: input.page,
    query: input.query ?? "query",
    clicks: input.clicks,
    impressions: input.impressions,
    ctr: input.impressions > 0 ? input.clicks / input.impressions : 0,
    position: input.position,
    syncedAt: "2026-06-29T00:00:00.000Z"
  };
}

function entry(overrides: Partial<GscOpportunityEntry> = {}): GscOpportunityEntry {
  return {
    type: "ctr-opportunity",
    page: "https://example.com/hello",
    clicks: 4,
    impressions: 1000,
    ctr: 0.004,
    position: 3,
    expectedCtr: 0.11,
    ...overrides
  };
}

function matchedEntry(
  overrides: Partial<MatchedGscOpportunityEntry> = {}
): MatchedGscOpportunityEntry {
  return {
    ...entry(),
    content: {
      contentItemId: "content-1",
      externalId: "post:1",
      title: "Hello"
    },
    ...overrides
  };
}

describe("expectedCtrForPosition", () => {
  it("steps down through the benchmark table by rounded position", () => {
    expect(expectedCtrForPosition(1)).toBe(0.25);
    expect(expectedCtrForPosition(2.4)).toBe(0.15);
    expect(expectedCtrForPosition(3)).toBe(0.11);
    expect(expectedCtrForPosition(10)).toBe(0.02);
  });

  it("uses a floor benchmark beyond position 10 and clamps invalid positions", () => {
    expect(expectedCtrForPosition(11)).toBe(0.015);
    expect(expectedCtrForPosition(50)).toBe(0.015);
    expect(expectedCtrForPosition(0)).toBe(0.25);
    expect(expectedCtrForPosition(Number.NaN)).toBe(0.25);
  });
});

describe("buildGscOpportunities", () => {
  it("reports unavailable while no insights are synced", () => {
    const opportunities = buildGscOpportunities([]);

    expect(opportunities.available).toBe(false);
    expect(opportunities.reason).toContain("No Search Console page insights");
    expect(opportunities.entries).toEqual([]);
  });

  it("flags high-impression pages whose CTR falls below half the position benchmark", () => {
    const opportunities = buildGscOpportunities([
      insight({ page: "https://example.com/low-ctr", clicks: 4, impressions: 1000, position: 3 })
    ]);

    expect(opportunities.available).toBe(true);
    expect(opportunities.range).toEqual(range);
    expect(opportunities.entries).toEqual([
      {
        type: "ctr-opportunity",
        page: "https://example.com/low-ctr",
        clicks: 4,
        impressions: 1000,
        ctr: 0.004,
        position: 3,
        expectedCtr: 0.11
      }
    ]);
  });

  it("skips CTR opportunities below the impression floor or at healthy CTR", () => {
    const opportunities = buildGscOpportunities([
      insight({ page: "https://example.com/tiny", clicks: 0, impressions: 199, position: 3 }),
      insight({ page: "https://example.com/healthy", clicks: 60, impressions: 1000, position: 3 })
    ]);

    expect(opportunities.entries).toEqual([]);
  });

  it("skips CTR opportunities ranking beyond the top positions", () => {
    const opportunities = buildGscOpportunities([
      insight({ page: "https://example.com/deep", clicks: 0, impressions: 1000, position: 18 })
    ]);

    expect(
      opportunities.entries.filter((candidate) => candidate.type === "ctr-opportunity")
    ).toEqual([]);
  });

  it("flags striking distance pages between positions 5 and 15 inclusive", () => {
    const opportunities = buildGscOpportunities([
      insight({ page: "https://example.com/at-5", clicks: 6, impressions: 120, position: 5 }),
      insight({ page: "https://example.com/at-15", clicks: 2, impressions: 150, position: 15 }),
      insight({ page: "https://example.com/at-4-9", clicks: 8, impressions: 150, position: 4.9 }),
      insight({ page: "https://example.com/at-15-1", clicks: 1, impressions: 150, position: 15.1 }),
      insight({ page: "https://example.com/thin", clicks: 1, impressions: 99, position: 8 })
    ]);
    const strikingPages = opportunities.entries
      .filter((candidate) => candidate.type === "striking-distance")
      .map((candidate) => candidate.page);

    expect(strikingPages).toEqual(["https://example.com/at-15", "https://example.com/at-5"]);
  });

  it("aggregates rows per page across queries before applying thresholds", () => {
    const opportunities = buildGscOpportunities([
      insight({
        page: "https://example.com/split",
        clicks: 1,
        impressions: 80,
        position: 7,
        query: "a"
      }),
      insight({
        page: "https://example.com/split",
        clicks: 2,
        impressions: 40,
        position: 9,
        query: "b"
      })
    ]);
    const striking = opportunities.entries.find(
      (candidate) => candidate.type === "striking-distance"
    );

    expect(striking).toMatchObject({
      page: "https://example.com/split",
      clicks: 3,
      impressions: 120,
      ctr: 0.025
    });
    expect(striking?.position).toBeCloseTo(7.67, 2);
  });

  it("can surface both opportunity types for the same page", () => {
    const opportunities = buildGscOpportunities([
      insight({ page: "https://example.com/both", clicks: 2, impressions: 1000, position: 6 })
    ]);

    expect(opportunities.entries.map((candidate) => candidate.type).sort()).toEqual([
      "ctr-opportunity",
      "striking-distance"
    ]);
  });

  it("sorts by impressions descending and bounds each type", () => {
    const insights = Array.from({ length: 12 }, (_, index) =>
      insight({
        page: `https://example.com/page-${String(index).padStart(2, "0")}`,
        clicks: 1,
        impressions: 100 + index,
        position: 8
      })
    );
    const opportunities = buildGscOpportunities(insights, { limitPerType: 3 });

    expect(opportunities.entries).toHaveLength(3);
    expect(opportunities.entries.map((candidate) => candidate.impressions)).toEqual([
      111, 110, 109
    ]);
  });
});

describe("matchGscOpportunityEntries", () => {
  it("attaches synced content matches and leaves misses null", () => {
    const matched = matchGscOpportunityEntries(
      [entry(), entry({ page: "https://example.com/unknown" })],
      [
        {
          id: "content-1",
          externalId: "post:1",
          url: "https://www.example.com/hello/",
          title: "Hello"
        }
      ]
    );

    expect(matched[0]?.content).toMatchObject({ contentItemId: "content-1" });
    expect(matched[1]?.content).toBeNull();
  });
});

describe("buildGscOpportunityBacklogCandidates", () => {
  it("builds candidates only for matched entries with stable candidate ids", () => {
    const candidates = buildGscOpportunityBacklogCandidates([
      matchedEntry(),
      matchedEntry({ page: "https://example.com/unmatched", content: null })
    ]);

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      id: "content-1:gsc-ctr-opportunity",
      type: "ctr-opportunity",
      priority: "medium",
      page: "https://example.com/hello"
    });
    expect(candidates[0]?.title).toContain("Hello");
    expect(candidates[0]?.rationale).toContain("position 3");
    expect(candidates[0]?.rationale).toContain("0.4% CTR");
    expect(candidates[0]?.rationale).toContain("11% benchmark");
  });

  it("builds a striking distance candidate with position rationale", () => {
    const candidates = buildGscOpportunityBacklogCandidates([
      matchedEntry({
        type: "striking-distance",
        position: 12,
        impressions: 400,
        expectedCtr: null
      })
    ]);

    expect(candidates[0]).toMatchObject({
      id: "content-1:gsc-striking-distance",
      type: "striking-distance",
      title: "Push Hello into top positions"
    });
    expect(candidates[0]?.rationale).toContain("position 12");
    expect(candidates[0]?.rationale).toContain("400 impressions");
  });

  it("keeps one candidate per content item and type, preferring bigger impressions", () => {
    const candidates = buildGscOpportunityBacklogCandidates([
      matchedEntry({ page: "https://example.com/hello?ref=a", impressions: 500 }),
      matchedEntry({ page: "https://example.com/hello", impressions: 900 })
    ]);

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.page).toBe("https://example.com/hello");
  });
});

describe("buildGscOpportunityCandidateId", () => {
  it("namespaces gsc candidate ids per content item and type", () => {
    expect(buildGscOpportunityCandidateId("content-1", "striking-distance")).toBe(
      "content-1:gsc-striking-distance"
    );
  });
});
