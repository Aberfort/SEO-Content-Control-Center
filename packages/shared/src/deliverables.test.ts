import { describe, expect, it } from "vitest";

import {
  buildWorkspaceDeliverableSummary,
  formatClientReportCsv,
  formatClientReportHtml
} from "./deliverables";

describe("workspace deliverables", () => {
  const summary = buildWorkspaceDeliverableSummary({
    organizationId: "org-1",
    organizationName: 'Agency <North> & "Co"',
    startDate: "2026-08-03",
    endDate: "2026-08-09",
    generatedAt: "2026-08-10T08:00:00.000Z",
    sites: [
      {
        siteId: "site-2",
        siteName: "Zulu",
        siteUrl: "https://zulu.example",
        newCriticalFindings: 1,
        significantTrafficDrops: 2,
        completedTasks: 3,
        unresolvedRisks: 4,
        overdueTasks: 1,
        failedOperations: 0,
        outcomes: { improved: 2, declined: 1, stable: 0, awaitingFollowup: 1 }
      },
      {
        siteId: "site-1",
        siteName: "Alpha, Inc.",
        siteUrl: "https://alpha.example",
        newCriticalFindings: 0,
        significantTrafficDrops: 1,
        completedTasks: 2,
        unresolvedRisks: 3,
        overdueTasks: 0,
        failedOperations: 1,
        outcomes: { improved: 1, declined: 0, stable: 2, awaitingFollowup: 0 }
      }
    ]
  });

  it("sorts sites and totals every reported measure", () => {
    expect(summary.sites.map((site) => site.siteName)).toEqual(["Alpha, Inc.", "Zulu"]);
    expect(summary.totals).toEqual({
      newCriticalFindings: 1,
      significantTrafficDrops: 3,
      completedTasks: 5,
      unresolvedRisks: 7,
      overdueTasks: 1,
      failedOperations: 1,
      outcomes: { improved: 3, declined: 1, stable: 2, awaitingFollowup: 1 }
    });
  });

  it("exports escaped CSV and print-ready HTML with methodology", () => {
    expect(formatClientReportCsv(summary)).toContain('"Alpha, Inc."');
    const html = formatClientReportHtml(summary);
    expect(html).toContain("Agency &lt;North&gt; &amp; &quot;Co&quot;");
    expect(html).toContain("period correlation, not proof");
    expect(html).not.toContain("Agency <North>");
  });
});
