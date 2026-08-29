export const deliverableMethodology = [
  "Activity counts use tenant-scoped records inside the stated UTC period; unresolved and overdue counts are snapshots at generation time.",
  "Significant traffic drops are high-severity GSC traffic-loss findings backed by persisted Search Console snapshots.",
  "Search outcome movement is period correlation, not proof that a specific change caused the result.",
  "Regression counts come from the deterministic monitoring rule engine and name a possible cause, never a confirmed one."
] as const;

export type SiteDeliverableSummary = {
  siteId: string;
  siteName: string;
  siteUrl: string;
  newCriticalFindings: number;
  significantTrafficDrops: number;
  completedTasks: number;
  unresolvedRisks: number;
  overdueTasks: number;
  failedOperations: number;
  newRegressions: number;
  openRegressions: number;
  outcomes: {
    improved: number;
    declined: number;
    stable: number;
    awaitingFollowup: number;
  };
  taskOutcomes: {
    improved: number;
    stable: number;
    declined: number;
    inconclusive: number;
    awaitingVerification: number;
  };
};

export type WorkspaceDeliverableSummary = {
  organizationId: string;
  organizationName: string;
  period: { startDate: string; endDate: string };
  generatedAt: string;
  sites: SiteDeliverableSummary[];
  totals: Omit<
    SiteDeliverableSummary,
    "siteId" | "siteName" | "siteUrl" | "outcomes" | "taskOutcomes"
  > & {
    outcomes: SiteDeliverableSummary["outcomes"];
    taskOutcomes: SiteDeliverableSummary["taskOutcomes"];
  };
  methodology: readonly string[];
};

export function buildWorkspaceDeliverableSummary(input: {
  organizationId: string;
  organizationName: string;
  startDate: string;
  endDate: string;
  generatedAt: string;
  sites: SiteDeliverableSummary[];
}): WorkspaceDeliverableSummary {
  const sites = [...input.sites].sort(
    (left, right) =>
      left.siteName.localeCompare(right.siteName) || left.siteId.localeCompare(right.siteId)
  );
  const totals = sites.reduce<WorkspaceDeliverableSummary["totals"]>(
    (result, site) => ({
      newCriticalFindings: result.newCriticalFindings + site.newCriticalFindings,
      significantTrafficDrops: result.significantTrafficDrops + site.significantTrafficDrops,
      completedTasks: result.completedTasks + site.completedTasks,
      unresolvedRisks: result.unresolvedRisks + site.unresolvedRisks,
      overdueTasks: result.overdueTasks + site.overdueTasks,
      failedOperations: result.failedOperations + site.failedOperations,
      newRegressions: result.newRegressions + site.newRegressions,
      openRegressions: result.openRegressions + site.openRegressions,
      outcomes: {
        improved: result.outcomes.improved + site.outcomes.improved,
        declined: result.outcomes.declined + site.outcomes.declined,
        stable: result.outcomes.stable + site.outcomes.stable,
        awaitingFollowup: result.outcomes.awaitingFollowup + site.outcomes.awaitingFollowup
      },
      taskOutcomes: {
        improved: result.taskOutcomes.improved + site.taskOutcomes.improved,
        stable: result.taskOutcomes.stable + site.taskOutcomes.stable,
        declined: result.taskOutcomes.declined + site.taskOutcomes.declined,
        inconclusive: result.taskOutcomes.inconclusive + site.taskOutcomes.inconclusive,
        awaitingVerification:
          result.taskOutcomes.awaitingVerification + site.taskOutcomes.awaitingVerification
      }
    }),
    {
      newCriticalFindings: 0,
      significantTrafficDrops: 0,
      completedTasks: 0,
      unresolvedRisks: 0,
      overdueTasks: 0,
      failedOperations: 0,
      newRegressions: 0,
      openRegressions: 0,
      outcomes: { improved: 0, declined: 0, stable: 0, awaitingFollowup: 0 },
      taskOutcomes: {
        improved: 0,
        stable: 0,
        declined: 0,
        inconclusive: 0,
        awaitingVerification: 0
      }
    }
  );

  return {
    organizationId: input.organizationId,
    organizationName: input.organizationName,
    period: { startDate: input.startDate, endDate: input.endDate },
    generatedAt: input.generatedAt,
    sites,
    totals,
    methodology: deliverableMethodology
  };
}

export function formatClientReportCsv(summary: WorkspaceDeliverableSummary): string {
  const rows = [
    [
      "siteName",
      "siteUrl",
      "newCriticalFindings",
      "significantTrafficDrops",
      "completedTasks",
      "unresolvedRisks",
      "overdueTasks",
      "failedOperations",
      "newRegressions",
      "openRegressions",
      "improvedOutcomes",
      "declinedOutcomes",
      "stableOutcomes",
      "awaitingFollowup",
      "verifiedImprovedTasks",
      "verifiedStableTasks",
      "verifiedDeclinedTasks",
      "inconclusiveTasks",
      "awaitingTaskVerification"
    ],
    ...summary.sites.map((site) => [
      site.siteName,
      site.siteUrl,
      site.newCriticalFindings,
      site.significantTrafficDrops,
      site.completedTasks,
      site.unresolvedRisks,
      site.overdueTasks,
      site.failedOperations,
      site.newRegressions,
      site.openRegressions,
      site.outcomes.improved,
      site.outcomes.declined,
      site.outcomes.stable,
      site.outcomes.awaitingFollowup,
      site.taskOutcomes.improved,
      site.taskOutcomes.stable,
      site.taskOutcomes.declined,
      site.taskOutcomes.inconclusive,
      site.taskOutcomes.awaitingVerification
    ])
  ];

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

export function formatClientReportHtml(summary: WorkspaceDeliverableSummary): string {
  const rows = summary.sites
    .map(
      (site) =>
        `<tr><td>${escapeHtml(site.siteName)}</td><td>${escapeHtml(site.siteUrl)}</td><td>${site.newCriticalFindings}</td><td>${site.significantTrafficDrops}</td><td>${site.completedTasks}</td><td>${site.unresolvedRisks}</td><td>${site.overdueTasks}</td><td>${site.failedOperations}</td><td>${site.newRegressions}</td><td>${site.openRegressions}</td><td>${site.outcomes.improved}</td><td>${site.outcomes.declined}</td><td>${site.taskOutcomes.improved}</td><td>${site.taskOutcomes.awaitingVerification}</td></tr>`
    )
    .join("");
  const methodology = summary.methodology.map((item) => `<li>${escapeHtml(item)}</li>`).join("");

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(summary.organizationName)} SEO report</title><style>body{color:#17201c;font:14px/1.5 system-ui,sans-serif;margin:32px}h1{font-size:24px}p{color:#53615c}table{border-collapse:collapse;width:100%}th,td{border-bottom:1px solid #d8dfdc;padding:8px;text-align:left}th{font-size:11px;text-transform:uppercase}section{margin-top:28px}@media print{body{margin:12mm}}</style></head><body><h1>${escapeHtml(summary.organizationName)} SEO delivery report</h1><p>Evidence period: ${escapeHtml(summary.period.startDate)} to ${escapeHtml(summary.period.endDate)} UTC. Generated ${escapeHtml(summary.generatedAt)}.</p><section><h2>Site results</h2><table><thead><tr><th>Site</th><th>URL</th><th>Critical</th><th>Traffic drops</th><th>Completed</th><th>Open risks</th><th>Overdue</th><th>Failed ops</th><th>New regressions</th><th>Open regressions</th><th>Search improved</th><th>Search declined</th><th>Verified task wins</th><th>Awaiting verification</th></tr></thead><tbody>${rows}</tbody></table></section><section><h2>Methodology</h2><ul>${methodology}</ul></section></body></html>`;
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
