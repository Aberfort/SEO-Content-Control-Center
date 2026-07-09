import { describe, expect, it } from "vitest";

import type { MatchedPageTrafficLossEntry } from "./gsc-content-matching";
import {
  buildAuditIssueInputsFromTrafficLoss,
  buildTrafficLossIssueFingerprint,
  mapDropRatioToAuditSeverity,
  trafficLossIssueType
} from "./gsc-traffic-loss-issues";

const currentRange = { startDate: "2026-06-22", endDate: "2026-06-28" };
const baselineRange = { startDate: "2026-06-15", endDate: "2026-06-21" };

function matchedDrop(
  overrides: Partial<MatchedPageTrafficLossEntry> = {}
): MatchedPageTrafficLossEntry {
  return {
    page: "https://example.com/hello",
    currentClicks: 30,
    baselineClicks: 100,
    clicksDelta: -70,
    dropRatio: 0.7,
    currentPosition: 6.2,
    baselinePosition: 4.1,
    content: {
      contentItemId: "content-1",
      externalId: "post:1",
      title: "Hello"
    },
    ...overrides
  };
}

describe("mapDropRatioToAuditSeverity", () => {
  it("maps drops at or above the high threshold to HIGH and the rest to MEDIUM", () => {
    expect(mapDropRatioToAuditSeverity(0.5)).toBe("HIGH");
    expect(mapDropRatioToAuditSeverity(0.9)).toBe("HIGH");
    expect(mapDropRatioToAuditSeverity(0.49)).toBe("MEDIUM");
    expect(mapDropRatioToAuditSeverity(0.25)).toBe("MEDIUM");
  });

  it("honors a custom high threshold", () => {
    expect(mapDropRatioToAuditSeverity(0.4, 0.4)).toBe("HIGH");
    expect(mapDropRatioToAuditSeverity(0.39, 0.4)).toBe("MEDIUM");
  });
});

describe("buildAuditIssueInputsFromTrafficLoss", () => {
  it("materializes only drops matched to synced content", () => {
    const issues = buildAuditIssueInputsFromTrafficLoss({
      drops: [matchedDrop(), matchedDrop({ page: "https://example.com/unmatched", content: null })],
      currentRange,
      baselineRange,
      propertyUrl: "sc-domain:example.com"
    });

    expect(issues).toHaveLength(1);
    expect(issues[0]?.affectedUrl).toBe("https://example.com/hello");
  });

  it("builds the issue with detection evidence and a stable fingerprint", () => {
    const issues = buildAuditIssueInputsFromTrafficLoss({
      drops: [matchedDrop()],
      currentRange,
      baselineRange,
      propertyUrl: "sc-domain:example.com"
    });

    expect(issues[0]).toMatchObject({
      issueType: trafficLossIssueType,
      severity: "HIGH",
      affectedUrl: "https://example.com/hello",
      fingerprint: "gsc:traffic-loss:post:1",
      evidence: {
        source: "gsc_traffic_loss",
        contentItemId: "content-1",
        externalId: "post:1",
        propertyUrl: "sc-domain:example.com",
        currentRange,
        baselineRange,
        currentClicks: 30,
        baselineClicks: 100,
        clicksDelta: -70,
        dropRatio: 0.7,
        currentPosition: 6.2,
        baselinePosition: 4.1
      }
    });
    expect(issues[0]?.explanation).toContain("dropped 70%");
    expect(issues[0]?.explanation).toContain("100 to 30");
    expect(issues[0]?.explanation).toContain("2026-06-15 to 2026-06-21");
    expect(issues[0]?.potentialImpact).toContain("70 clicks");
  });

  it("maps drop ratios below the high threshold to MEDIUM severity", () => {
    const issues = buildAuditIssueInputsFromTrafficLoss({
      drops: [matchedDrop({ currentClicks: 70, clicksDelta: -30, dropRatio: 0.3 })],
      currentRange,
      baselineRange,
      propertyUrl: null
    });

    expect(issues[0]?.severity).toBe("MEDIUM");
    expect(issues[0]?.evidence.propertyUrl).toBeNull();
  });

  it("dedupes drops matching the same content item keeping the biggest click loss", () => {
    const issues = buildAuditIssueInputsFromTrafficLoss({
      drops: [
        matchedDrop({
          page: "https://example.com/hello?ref=a",
          currentClicks: 60,
          baselineClicks: 100,
          clicksDelta: -40,
          dropRatio: 0.4
        }),
        matchedDrop({ page: "https://example.com/hello" })
      ],
      currentRange,
      baselineRange,
      propertyUrl: null
    });

    expect(issues).toHaveLength(1);
    expect(issues[0]?.affectedUrl).toBe("https://example.com/hello");
    expect(issues[0]?.evidence.clicksDelta).toBe(-70);
  });

  it("falls back to the page url in the explanation when the title is empty", () => {
    const issues = buildAuditIssueInputsFromTrafficLoss({
      drops: [
        matchedDrop({
          content: { contentItemId: "content-1", externalId: "post:1", title: "  " }
        })
      ],
      currentRange,
      baselineRange,
      propertyUrl: null
    });

    expect(issues[0]?.explanation).toContain('"https://example.com/hello"');
  });

  it("returns no issues when comparison ranges are missing", () => {
    expect(
      buildAuditIssueInputsFromTrafficLoss({
        drops: [matchedDrop()],
        currentRange: null,
        baselineRange,
        propertyUrl: null
      })
    ).toEqual([]);
    expect(
      buildAuditIssueInputsFromTrafficLoss({
        drops: [matchedDrop()],
        currentRange,
        baselineRange: null,
        propertyUrl: null
      })
    ).toEqual([]);
  });
});

describe("buildTrafficLossIssueFingerprint", () => {
  it("prefixes the synced external id", () => {
    expect(buildTrafficLossIssueFingerprint("post:42")).toBe("gsc:traffic-loss:post:42");
  });
});
