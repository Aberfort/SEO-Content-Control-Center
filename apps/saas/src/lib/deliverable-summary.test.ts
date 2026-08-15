import { describe, expect, it } from "vitest";

import { buildSiteDeliverableSummary } from "./deliverable-summary";

describe("buildSiteDeliverableSummary", () => {
  it("separates period activity from current unresolved and overdue snapshots", () => {
    const result = buildSiteDeliverableSummary({
      siteId: "site-1",
      siteName: "Example",
      siteUrl: "https://example.com",
      start: new Date("2026-08-03T00:00:00.000Z"),
      endExclusive: new Date("2026-08-10T00:00:00.000Z"),
      generatedAt: new Date("2026-08-10T08:00:00.000Z"),
      issues: [
        {
          issueType: "gsc.traffic-loss",
          status: "OPEN",
          severity: "HIGH",
          evidence: {},
          createdAt: "2026-08-05T00:00:00.000Z",
          updatedAt: "2026-08-05T00:00:00.000Z"
        },
        {
          issueType: "metadata.title_missing",
          status: "OPEN",
          severity: "CRITICAL",
          evidence: {},
          createdAt: "2026-08-06T00:00:00.000Z",
          updatedAt: "2026-08-06T00:00:00.000Z"
        }
      ],
      tasks: [
        { status: "DONE", dueDate: null, updatedAt: "2026-08-08T00:00:00.000Z" },
        {
          status: "TODO",
          dueDate: "2026-08-09T00:00:00.000Z",
          updatedAt: "2026-08-01T00:00:00.000Z"
        }
      ],
      operations: [{ status: "FAILED", updatedAt: "2026-08-07T00:00:00.000Z" }]
    });

    expect(result).toMatchObject({
      newCriticalFindings: 1,
      significantTrafficDrops: 1,
      completedTasks: 1,
      unresolvedRisks: 2,
      overdueTasks: 1,
      failedOperations: 1
    });
  });
});
