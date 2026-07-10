import Link from "next/link";
import { redirect } from "next/navigation";
import { hasPermission } from "@sccc/shared";

import {
  confirmBulkOperationAction,
  createAuditForSiteAction,
  createBacklogTaskCommentAction,
  createBacklogTaskFromAuditIssueAction,
  createBacklogTaskFromCandidateAction,
  createBacklogTasksFromAuditAction,
  createBillingCheckoutSessionAction,
  createBillingPortalSessionAction,
  createBulkOperationPreviewAction,
  disconnectPluginConnectionAction,
  finishBulkOperationAction,
  markAllNotificationsReadAction,
  rollbackBulkOperationAction,
  runBulkOperationDryRunAction,
  retryBulkOperationAction,
  startBulkOperationAction,
  syncGscDailyMetricsAction,
  syncGscSearchInsightsAction,
  updateAuditIssueStatusAction,
  updateBacklogTaskAssignmentAction,
  updateBacklogTaskStatusAction,
  updateNotificationReadStateAction
} from "@/app/actions";
import { CreateOrganizationForm } from "@/components/create-organization-form";
import { CreateSiteForm } from "@/components/create-site-form";
import { GscPropertyPicker } from "@/components/gsc-property-picker";
import { matchTrafficLossPages } from "@/lib/gsc-content-matching";
import {
  buildGscOpportunities,
  buildGscOpportunityCandidateId,
  matchGscOpportunityEntries
} from "@/lib/gsc-opportunities";
import {
  buildPageTrafficLoss,
  buildSiteTrafficLoss,
  shiftDateOnly,
  type SiteTrafficLoss
} from "@/lib/gsc-traffic-loss";
import { InviteActionsForm } from "@/components/invite-actions-form";
import { InviteMemberForm } from "@/components/invite-member-form";
import { LogoutButton } from "@/components/logout-button";
import { MemberRoleForm } from "@/components/member-role-form";
import { OnboardingChecklist } from "@/components/onboarding-checklist";
import { getAppRepository } from "@/lib/app-repository";
import { getCurrentUser } from "@/lib/auth";
import {
  buildSyncedContentBacklogCandidates,
  buildSyncedContentHealthSignals
} from "@/lib/content-health";
import { buildOnboardingChecklist } from "@/lib/onboarding-checklist";
import type {
  BillingSubscription,
  GscConnectionOverview,
  GscDailyMetric,
  GscSearchInsight,
  Site,
  SyncedContentMetadata
} from "@/lib/types";

const navItems = ["Dashboard", "Sites", "Audits", "Backlog", "Integrations", "Billing"];

type AppHomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const contentTypes = [
  { label: "All types", value: "" },
  { label: "Posts", value: "post" },
  { label: "Pages", value: "page" },
  { label: "Custom post types", value: "custom_post_type" },
  { label: "Taxonomies", value: "taxonomy" }
];

const contentStatuses = [
  { label: "All statuses", value: "" },
  { label: "Published", value: "publish" },
  { label: "Draft", value: "draft" },
  { label: "Private", value: "private" },
  { label: "Pending", value: "pending" },
  { label: "Future", value: "future" }
];

const backlogStatuses = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "SNOOZED", "IGNORED"] as const;
const backlogSeverities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
const auditIssueStatuses = ["OPEN", "IGNORED", "RESOLVED", "SNOOZED"] as const;
const billingStatuses = ["success", "cancel", "error", "portal_return"] as const;
const gscStatuses = [
  "connected",
  "metrics_synced",
  "insights_synced",
  "property_selected",
  "error"
] as const;

export default async function AppHomePage({ searchParams }: AppHomePageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  const params = (await searchParams) ?? {};
  const repository = getAppRepository();
  const organizations = await repository.listOrganizationSummariesForUser(user);
  const activeOrganization = organizations[0] ?? null;
  const selectedSiteId = readQueryParam(params, "site");
  const activeSite =
    activeOrganization?.sites.find((site) => site.id === selectedSiteId) ??
    activeOrganization?.sites[0] ??
    null;
  const contentFilters = {
    query: readQueryParam(params, "q"),
    type: readQueryParam(params, "type"),
    status: readQueryParam(params, "status"),
    cursor: readQueryParam(params, "cursor"),
    limit: 10
  };
  const backlogFilters = {
    query: readQueryParam(params, "backlogQ"),
    status: readEnumQueryParam(params, "backlogStatus", backlogStatuses),
    severity: readEnumQueryParam(params, "backlogSeverity", backlogSeverities)
  };
  const auditIssueFilters = {
    query: readQueryParam(params, "auditIssueQ"),
    status: readEnumQueryParam(params, "auditIssueStatus", auditIssueStatuses),
    severity: readEnumQueryParam(params, "auditIssueSeverity", backlogSeverities)
  };
  const billingStatus = readEnumQueryParam(params, "billing", billingStatuses);
  const billingMessage = readQueryParam(params, "message");
  const gscStatus = readEnumQueryParam(params, "gsc", gscStatuses);
  const gscMessage = readQueryParam(params, "message");
  const selectedContentId = readQueryParam(params, "content");
  const selectedAuditId = readQueryParam(params, "audit");
  const activeMembers = activeOrganization
    ? await repository.listMembersForOrganization(user.id, activeOrganization.id)
    : [];
  const assignableMembers = activeMembers.filter((member) => member.status === "ACTIVE");
  const canReadSite = activeOrganization
    ? hasPermission(activeOrganization.role, "site:read")
    : false;
  const canReadBilling = activeOrganization
    ? hasPermission(activeOrganization.role, "billing:read")
    : false;
  const billingOverview =
    activeOrganization && canReadBilling
      ? await repository.getBillingOverviewForOrganization(user.id, activeOrganization.id)
      : null;
  const gscOverview =
    activeOrganization && activeSite && canReadSite
      ? await repository.getGscConnectionOverviewForSite(
          user.id,
          activeOrganization.id,
          activeSite.id
        )
      : null;
  const activeGscConnection = gscOverview?.connections[0] ?? null;
  const gscMetrics =
    activeOrganization && activeSite && canReadSite && activeGscConnection
      ? await repository.listGscDailyMetrics(
          user.id,
          activeOrganization.id,
          activeSite.id,
          activeGscConnection.propertyUrl
        )
      : [];
  const gscInsights =
    activeOrganization && activeSite && canReadSite && activeGscConnection
      ? await repository.listGscSearchInsights(user.id, activeOrganization.id, activeSite.id, {
          propertyUrl: activeGscConnection.propertyUrl,
          limit: 10
        })
      : [];
  const gscFullInsights =
    activeOrganization && activeSite && canReadSite && activeGscConnection
      ? await repository.listGscSearchInsights(user.id, activeOrganization.id, activeSite.id, {
          propertyUrl: activeGscConnection.propertyUrl
        })
      : [];
  const gscBaselineInsights =
    activeOrganization && activeSite && activeGscConnection && gscFullInsights.length > 0
      ? await repository.listGscSearchInsights(user.id, activeOrganization.id, activeSite.id, {
          propertyUrl: activeGscConnection.propertyUrl,
          startDate: shiftDateOnly(gscFullInsights[0]!.startDate, -7),
          endDate: shiftDateOnly(gscFullInsights[0]!.endDate, -7)
        })
      : [];
  const gscSiteTrafficLoss = activeGscConnection ? buildSiteTrafficLoss(gscMetrics) : null;
  const gscPageTrafficLossBase = activeGscConnection
    ? buildPageTrafficLoss(gscFullInsights, gscBaselineInsights)
    : null;
  const gscOpportunitiesBase = activeGscConnection ? buildGscOpportunities(gscFullInsights) : null;
  const gscContentUrls =
    activeOrganization &&
    activeSite &&
    ((gscPageTrafficLossBase?.drops.length ?? 0) > 0 ||
      (gscOpportunitiesBase?.entries.length ?? 0) > 0)
      ? await repository.listSyncedContentUrlsForSite(user.id, activeOrganization.id, activeSite.id)
      : [];
  const gscPageTrafficLoss = gscPageTrafficLossBase
    ? {
        ...gscPageTrafficLossBase,
        drops: matchTrafficLossPages(gscPageTrafficLossBase.drops, gscContentUrls)
      }
    : null;
  const gscOpportunities = gscOpportunitiesBase
    ? {
        ...gscOpportunitiesBase,
        entries: matchGscOpportunityEntries(gscOpportunitiesBase.entries, gscContentUrls)
      }
    : null;
  const syncedContent =
    activeOrganization && activeSite
      ? await repository.listSyncedContentForSite(
          user.id,
          activeOrganization.id,
          activeSite.id,
          contentFilters
        )
      : {
          items: [],
          nextCursor: null,
          total: 0
        };
  const backlogTasks =
    activeOrganization && activeSite
      ? await repository.listBacklogTasksForSite(
          user.id,
          activeOrganization.id,
          activeSite.id,
          backlogFilters
        )
      : {
          items: [],
          summary: {
            total: 0,
            open: 0,
            done: 0,
            byStatus: {
              TODO: 0,
              IN_PROGRESS: 0,
              IN_REVIEW: 0,
              DONE: 0,
              SNOOZED: 0,
              IGNORED: 0
            },
            bySeverity: {
              LOW: 0,
              MEDIUM: 0,
              HIGH: 0,
              CRITICAL: 0
            }
          }
        };
  const bulkOperations =
    activeOrganization && activeSite
      ? await repository.listBulkOperationsForSite(user.id, activeOrganization.id, activeSite.id, {
          limit: 5
        })
      : [];
  const auditRuns =
    activeOrganization && activeSite
      ? await repository.listAuditsForSite(user.id, activeOrganization.id, activeSite.id, {
          limit: 5
        })
      : [];
  const activeAudit =
    auditRuns.find((audit) => audit.id === selectedAuditId) ?? auditRuns[0] ?? null;
  const auditIssues =
    activeOrganization && activeSite && activeAudit
      ? await repository.listAuditIssuesForAudit(
          user.id,
          activeOrganization.id,
          activeSite.id,
          activeAudit.id,
          {
            query: auditIssueFilters.query,
            status: auditIssueFilters.status,
            severity: auditIssueFilters.severity,
            limit: 20
          }
        )
      : [];
  const auditIssueSummaryItems =
    activeOrganization && activeSite && activeAudit
      ? await repository.listAuditIssuesForAudit(
          user.id,
          activeOrganization.id,
          activeSite.id,
          activeAudit.id,
          { limit: 500 }
        )
      : [];
  const auditIssueSummary = buildAuditIssueSummary(auditIssueSummaryItems);
  const selectedContentItem =
    activeOrganization && activeSite && selectedContentId
      ? await repository.getSyncedContentItem(
          user.id,
          activeOrganization.id,
          activeSite.id,
          selectedContentId
        )
      : null;
  const selectedContentHealthSignals = selectedContentItem
    ? buildSyncedContentHealthSignals(selectedContentItem)
    : [];
  const selectedContentBacklogCandidates = selectedContentItem
    ? buildSyncedContentBacklogCandidates(selectedContentItem, selectedContentHealthSignals)
    : [];
  const totalSites = organizations.reduce(
    (count, organization) => count + organization.sites.length,
    0
  );
  const latestActivity = activeOrganization?.activityLogs.slice(0, 5) ?? [];
  const latestNotifications = activeOrganization
    ? await repository.listNotificationsForOrganization(user.id, activeOrganization.id, {
        limit: 5
      })
    : [];
  const unreadNotifications = activeOrganization
    ? await repository.listNotificationsForOrganization(user.id, activeOrganization.id, {
        read: "unread",
        limit: 100
      })
    : [];
  const assistantRecommendationList =
    activeOrganization && activeSite
      ? await repository.listAssistantRecommendationsForSite(
          user.id,
          activeOrganization.id,
          activeSite.id,
          { limit: 5 }
        )
      : null;
  const assistantRecommendations = assistantRecommendationList?.recommendations ?? [];
  const assistantUsage = assistantRecommendationList?.usage;
  const assistantAiSummary = assistantRecommendationList?.aiSummary ?? null;
  const currentHref = buildContentHref(params, {});
  const onboardingChecklist = buildOnboardingChecklist({
    organization: activeOrganization,
    activeSite,
    syncedContentTotal: syncedContent.total,
    auditRunCount: auditRuns.length,
    backlogTaskCount: backlogTasks.summary.total
  });

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">SEO Content Control Center</div>
        <p className="sidebar-note">{user.email}</p>
        <LogoutButton />
        <nav className="nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <Link
              key={item}
              href={item === "Dashboard" ? "/" : "#"}
              aria-current={item === "Dashboard" ? "page" : undefined}
            >
              {item}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="main">
        <div className="page-header">
          <div>
            <p className="eyebrow">Workspace setup</p>
            <h1>
              {activeOrganization
                ? `${activeOrganization.name} is ready for WordPress connection.`
                : "Create your workspace, then connect WordPress."}
            </h1>
          </div>
          <Link className="button" href="/dashboard">
            View dashboard
          </Link>
        </div>

        <section className="grid" aria-label="Setup summary">
          <article className="panel">
            <h2>{organizations.length} organizations</h2>
            <p>Current dev session user can only see organizations where they are a member.</p>
          </article>
          <article className="panel">
            <h2>{totalSites} WordPress sites</h2>
            <p>Sites are tenant-scoped and start in pending connection status.</p>
          </article>
          <article className="panel">
            <h2>Safe operations only</h2>
            <p>Risky SEO changes require preview, dry run, confirmation, and audit logs.</p>
          </article>
        </section>

        <OnboardingChecklist
          checklist={onboardingChecklist}
          hrefs={{
            workspace: "#workspace-setup",
            site: "#workspace-setup",
            plugin: "#sites-title",
            content: "#synced-content-title",
            audit: "#audits-title",
            backlog: "#backlog-title"
          }}
        />

        <section id="workspace-setup" className="workspace-grid" aria-label="Workspace setup forms">
          <article className="panel">
            <h2>Create organization</h2>
            <p>Bootstrap a tenant workspace. The current dev user becomes Owner.</p>
            <CreateOrganizationForm />
          </article>

          <article className="panel">
            <h2>Add WordPress site</h2>
            {activeOrganization ? (
              <>
                <p>
                  Add the first site to {activeOrganization.name}. Plugin connection comes next.
                </p>
                <CreateSiteForm organizationId={activeOrganization.id} />
              </>
            ) : (
              <p className="empty-copy">Create an organization before adding a WordPress site.</p>
            )}
          </article>
        </section>

        <section className="panel empty-state" aria-labelledby="sites-title">
          <div className="section-heading">
            <div>
              <h2 id="sites-title">Sites</h2>
              <p>Only sites in the selected tenant are listed here.</p>
            </div>
          </div>

          {activeOrganization && activeOrganization.sites.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>URL</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activeOrganization.sites.map((site) => (
                    <tr key={site.id}>
                      <td>{site.name}</td>
                      <td>{site.url}</td>
                      <td>
                        <span className="status-pill">{site.status.replaceAll("_", " ")}</span>
                      </td>
                      <td>
                        {canDisconnectSiteStatus(site.status) ? (
                          <form action={disconnectPluginConnectionAction}>
                            <input
                              name="organizationId"
                              type="hidden"
                              value={activeOrganization.id}
                            />
                            <input name="siteId" type="hidden" value={site.id} />
                            <input name="redirectTo" type="hidden" value={currentHref} />
                            <button className="secondary-button" type="submit">
                              Disconnect
                            </button>
                          </form>
                        ) : (
                          <span className="muted-text">No action</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="empty-copy">
              No sites yet. Add a WordPress site to prepare plugin setup.
            </p>
          )}
        </section>

        <section className="panel" aria-labelledby="gsc-title">
          <div className="section-heading">
            <div>
              <h2 id="gsc-title">Google Search Console</h2>
              <p>Search performance property state for the selected site.</p>
            </div>
            {gscOverview ? (
              <span className="metric-pill">{formatGscConnectionCount(gscOverview)}</span>
            ) : null}
          </div>

          {gscStatus ? (
            <p
              className={`billing-feedback billing-feedback-${
                gscStatus === "error" ? "error" : "success"
              }`}
            >
              {formatGscFeedback(gscStatus, gscMessage)}
            </p>
          ) : null}

          {activeOrganization && activeSite ? (
            canReadSite && gscOverview ? (
              <>
                <div className="billing-current">
                  <div>
                    <small>Selected site</small>
                    <strong>{activeSite.name}</strong>
                    <span>{activeSite.url}</span>
                  </div>
                  <div>
                    <small>Status</small>
                    <strong>{gscOverview.connected ? "Connected" : "Not connected"}</strong>
                    <span>
                      {gscOverview.oauthConfigured ? "OAuth configured" : "OAuth not configured"}
                    </span>
                  </div>
                  <div className="billing-action-cell">
                    {gscOverview.action.enabled && gscOverview.action.href ? (
                      <Link className="secondary-button" href={gscOverview.action.href}>
                        {gscOverview.action.label}
                      </Link>
                    ) : (
                      <button className="secondary-button" disabled type="button">
                        {gscOverview.action.label}
                      </button>
                    )}
                    <span>
                      {gscOverview.action.enabled
                        ? "Requests read-only Search Console access from Google."
                        : gscOverview.action.disabledReason}
                    </span>
                    {activeGscConnection ? (
                      <>
                        <form action={syncGscDailyMetricsAction}>
                          <input
                            name="organizationId"
                            type="hidden"
                            value={activeOrganization.id}
                          />
                          <input name="siteId" type="hidden" value={activeSite.id} />
                          <input name="redirectTo" type="hidden" value={currentHref} />
                          <button className="secondary-button" type="submit">
                            Sync metrics
                          </button>
                        </form>
                        <form action={syncGscSearchInsightsAction}>
                          <input
                            name="organizationId"
                            type="hidden"
                            value={activeOrganization.id}
                          />
                          <input name="siteId" type="hidden" value={activeSite.id} />
                          <input name="redirectTo" type="hidden" value={currentHref} />
                          <button className="secondary-button" type="submit">
                            Sync insights
                          </button>
                        </form>
                      </>
                    ) : null}
                  </div>
                </div>

                {activeGscConnection && gscOverview.action.enabled ? (
                  <GscPropertyPicker
                    organizationId={activeOrganization.id}
                    siteId={activeSite.id}
                    currentPropertyUrl={activeGscConnection.propertyUrl}
                    returnHref={currentHref}
                  />
                ) : null}

                {gscOverview.connections.length > 0 ? (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Property</th>
                          <th>Google account</th>
                          <th>Connected</th>
                          <th>Updated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gscOverview.connections.map((connection) => (
                          <tr key={connection.id}>
                            <td>{connection.propertyUrl}</td>
                            <td>{connection.googleAccountEmail}</td>
                            <td>{formatDateTime(connection.connectedAt)}</td>
                            <td>{formatDateTime(connection.updatedAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="empty-copy">
                    No Google Search Console property is connected for this site yet.
                  </p>
                )}

                {activeGscConnection ? (
                  gscMetrics.length > 0 ? (
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Clicks</th>
                            <th>Impressions</th>
                            <th>CTR</th>
                            <th>Position</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gscMetrics.slice(-7).map((metric) => (
                            <tr key={metric.id}>
                              <td>{metric.date}</td>
                              <td>{metric.clicks.toLocaleString("en")}</td>
                              <td>{metric.impressions.toLocaleString("en")}</td>
                              <td>{formatGscCtr(metric)}</td>
                              <td>{formatGscPosition(metric)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="empty-copy">
                      Daily Search Console metrics will appear after the first sync.
                    </p>
                  )
                ) : null}

                {activeGscConnection ? (
                  gscInsights.length > 0 ? (
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Query</th>
                            <th>Page</th>
                            <th>Clicks</th>
                            <th>Impressions</th>
                            <th>CTR</th>
                            <th>Position</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gscInsights.map((insight) => (
                            <tr key={insight.id}>
                              <td>{insight.query}</td>
                              <td>{insight.page}</td>
                              <td>{insight.clicks.toLocaleString("en")}</td>
                              <td>{insight.impressions.toLocaleString("en")}</td>
                              <td>{formatGscCtr(insight)}</td>
                              <td>{formatGscPosition(insight)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="empty-copy">
                      Search Console page/query insights will appear after the first insight sync.
                    </p>
                  )
                ) : null}

                {activeGscConnection && gscSiteTrafficLoss && gscPageTrafficLoss ? (
                  <div className="stack-sm">
                    <h3 id="gsc-traffic-loss-title">Traffic loss</h3>
                    {gscSiteTrafficLoss.available &&
                    gscSiteTrafficLoss.current &&
                    gscSiteTrafficLoss.previous ? (
                      <p>
                        Clicks {gscSiteTrafficLoss.current.startDate} to{" "}
                        {gscSiteTrafficLoss.current.endDate}:{" "}
                        <strong>{gscSiteTrafficLoss.current.clicks.toLocaleString("en")}</strong> vs
                        previous window{" "}
                        <strong>{gscSiteTrafficLoss.previous.clicks.toLocaleString("en")}</strong> (
                        {formatTrafficLossDelta(gscSiteTrafficLoss)}) - severity:{" "}
                        <strong>{gscSiteTrafficLoss.severity}</strong>
                      </p>
                    ) : (
                      <p className="empty-copy">{gscSiteTrafficLoss.reason}</p>
                    )}
                    {gscPageTrafficLoss.available ? (
                      gscPageTrafficLoss.drops.length > 0 ? (
                        <div className="table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>Page</th>
                                <th>Content</th>
                                <th>Clicks now</th>
                                <th>Clicks baseline</th>
                                <th>Delta</th>
                                <th>Drop</th>
                              </tr>
                            </thead>
                            <tbody>
                              {gscPageTrafficLoss.drops.map((drop) => (
                                <tr key={drop.page}>
                                  <td>{drop.page}</td>
                                  <td>
                                    {drop.content
                                      ? drop.content.title || drop.content.externalId
                                      : "Not in synced inventory"}
                                  </td>
                                  <td>{drop.currentClicks.toLocaleString("en")}</td>
                                  <td>{drop.baselineClicks.toLocaleString("en")}</td>
                                  <td>{drop.clicksDelta.toLocaleString("en")}</td>
                                  <td>{`${(drop.dropRatio * 100).toLocaleString("en", {
                                    maximumFractionDigits: 1
                                  })}%`}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="empty-copy">
                          No pages exceed the traffic loss thresholds against the baseline snapshot.
                        </p>
                      )
                    ) : (
                      <p className="empty-copy">{gscPageTrafficLoss.reason}</p>
                    )}
                  </div>
                ) : null}

                {activeGscConnection && gscOpportunities ? (
                  <div className="stack-sm">
                    <h3 id="gsc-opportunities-title">Search opportunities</h3>
                    {gscOpportunities.available ? (
                      gscOpportunities.entries.length > 0 ? (
                        <div className="table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>Type</th>
                                <th>Page</th>
                                <th>Content</th>
                                <th>Impressions</th>
                                <th>CTR</th>
                                <th>Expected CTR</th>
                                <th>Position</th>
                                <th>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {gscOpportunities.entries.map((entry) => (
                                <tr key={`${entry.type}:${entry.page}`}>
                                  <td>
                                    {entry.type === "ctr-opportunity"
                                      ? "CTR opportunity"
                                      : "Striking distance"}
                                  </td>
                                  <td>{entry.page}</td>
                                  <td>
                                    {entry.content
                                      ? entry.content.title || entry.content.externalId
                                      : "Not in synced inventory"}
                                  </td>
                                  <td>{entry.impressions.toLocaleString("en")}</td>
                                  <td>{`${(entry.ctr * 100).toLocaleString("en", {
                                    maximumFractionDigits: 1
                                  })}%`}</td>
                                  <td>
                                    {entry.expectedCtr !== null
                                      ? `${(entry.expectedCtr * 100).toLocaleString("en", {
                                          maximumFractionDigits: 1
                                        })}%`
                                      : "-"}
                                  </td>
                                  <td>
                                    {entry.position.toLocaleString("en", {
                                      maximumFractionDigits: 1
                                    })}
                                  </td>
                                  <td>
                                    {entry.content && activeOrganization && activeSite ? (
                                      <form action={createBacklogTaskFromCandidateAction}>
                                        <input
                                          name="organizationId"
                                          type="hidden"
                                          value={activeOrganization.id}
                                        />
                                        <input name="siteId" type="hidden" value={activeSite.id} />
                                        <input
                                          name="contentItemId"
                                          type="hidden"
                                          value={entry.content.contentItemId}
                                        />
                                        <input
                                          name="candidateId"
                                          type="hidden"
                                          value={buildGscOpportunityCandidateId(
                                            entry.content.contentItemId,
                                            entry.type
                                          )}
                                        />
                                        <input
                                          name="redirectTo"
                                          type="hidden"
                                          value={currentHref}
                                        />
                                        <button className="text-button" type="submit">
                                          Create task
                                        </button>
                                      </form>
                                    ) : (
                                      <span className="empty-copy">Sync content to convert</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="empty-copy">
                          No pages meet the CTR opportunity or striking distance thresholds in the
                          latest insight snapshot.
                        </p>
                      )
                    ) : (
                      <p className="empty-copy">{gscOpportunities.reason}</p>
                    )}
                  </div>
                ) : null}
              </>
            ) : (
              <p className="empty-copy">
                Your role can not view Google Search Console connections for this site.
              </p>
            )
          ) : (
            <p className="empty-copy">Add a WordPress site before connecting Search Console.</p>
          )}
        </section>

        <section className="panel" aria-labelledby="activity-title">
          <h2 id="activity-title">Audit log</h2>
          {latestActivity.length > 0 ? (
            <ul className="activity-list">
              {latestActivity.map((activity) => (
                <li key={activity.id}>
                  <span>{activity.action}</span>
                  <time dateTime={activity.createdAt}>
                    {new Intl.DateTimeFormat("en", {
                      dateStyle: "medium",
                      timeStyle: "short"
                    }).format(new Date(activity.createdAt))}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-copy">Activity will appear after organization and site actions.</p>
          )}
        </section>

        <section className="panel" aria-labelledby="notifications-title">
          <div className="section-heading">
            <div>
              <h2 id="notifications-title">Notifications</h2>
              <p>Recent safe operation lifecycle updates for this organization.</p>
            </div>
            <div className="notification-heading-actions">
              <span className="metric-pill">
                {unreadNotifications.length} unread / {latestNotifications.length} recent
              </span>
              {unreadNotifications.length > 0 ? (
                <form action={markAllNotificationsReadAction}>
                  <input name="organizationId" type="hidden" value={activeOrganization?.id ?? ""} />
                  <input name="redirectTo" type="hidden" value={currentHref} />
                  <button className="text-button" type="submit">
                    Mark all read
                  </button>
                </form>
              ) : null}
            </div>
          </div>
          {latestNotifications.length > 0 ? (
            <ul className="notification-list">
              {latestNotifications.map((notification) => (
                <li
                  key={notification.id}
                  className={notification.readAt ? "notification-read" : "notification-unread"}
                >
                  <div>
                    <strong>{notification.title}</strong>
                    <span>{notification.body}</span>
                    <small>{notification.readAt ? "Read" : "Unread"}</small>
                  </div>
                  <div className="notification-actions">
                    <time dateTime={notification.createdAt}>
                      {formatDateTime(notification.createdAt)}
                    </time>
                    <form action={updateNotificationReadStateAction}>
                      <input
                        name="organizationId"
                        type="hidden"
                        value={notification.organizationId}
                      />
                      <input name="notificationId" type="hidden" value={notification.id} />
                      <input
                        name="read"
                        type="hidden"
                        value={notification.readAt ? "false" : "true"}
                      />
                      <input name="redirectTo" type="hidden" value={currentHref} />
                      <button className="text-button" type="submit">
                        {notification.readAt ? "Mark unread" : "Mark read"}
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-copy">
              Notifications will appear after safe operation results, rollbacks, or retries.
            </p>
          )}
        </section>

        <section className="panel" aria-labelledby="assistant-title">
          <div className="section-heading">
            <div>
              <h2 id="assistant-title">Assistant recommendations</h2>
              <p>Prioritized from backlog and synced content evidence for the selected site.</p>
            </div>
            <div className="assistant-heading-actions">
              <span className="metric-pill">{assistantRecommendations.length} recommendations</span>
              {assistantUsage ? (
                <span className="metric-pill">
                  {assistantUsage.used}/{assistantUsage.limit} AI credits
                  {assistantUsage.metered ? " (metered)" : ""}
                </span>
              ) : null}
            </div>
          </div>
          {assistantAiSummary ? (
            <div className="assistant-ai-summary">
              <p>{assistantAiSummary.text}</p>
              <small>
                AI summary from {assistantAiSummary.provider} ({assistantAiSummary.model}); the
                recommendations below stay deterministic and read-only.
              </small>
            </div>
          ) : null}
          {assistantRecommendations.length > 0 ? (
            <ul className="assistant-list">
              {assistantRecommendations.map((recommendation) => (
                <li key={recommendation.id}>
                  <div className="assistant-copy">
                    <div className="assistant-title-row">
                      <strong>{recommendation.title}</strong>
                      <span className={`priority-pill priority-${recommendation.priority}`}>
                        {recommendation.priority}
                      </span>
                    </div>
                    <p>{recommendation.rationale}</p>
                    <span>{recommendation.nextStep}</span>
                  </div>
                  <div className="assistant-source">
                    <small>{recommendation.source.type.replaceAll("_", " ")}</small>
                    {recommendation.source.url ? (
                      <a href={recommendation.source.url}>{recommendation.source.label}</a>
                    ) : (
                      <strong>{recommendation.source.label}</strong>
                    )}
                    <span>{recommendation.source.detail}</span>
                    <div className="assistant-action">
                      {recommendation.action.enabled && recommendation.action.targetTaskId ? (
                        <form action={createBulkOperationPreviewAction}>
                          <input
                            name="organizationId"
                            type="hidden"
                            value={recommendation.organizationId}
                          />
                          <input name="siteId" type="hidden" value={recommendation.siteId} />
                          <input
                            name="taskId"
                            type="hidden"
                            value={recommendation.action.targetTaskId}
                          />
                          <input
                            name="redirectTo"
                            type="hidden"
                            value={buildContentHref(params, {
                              site: recommendation.siteId
                            })}
                          />
                          <button className="secondary-button" type="submit">
                            {recommendation.action.label}
                          </button>
                        </form>
                      ) : (
                        <button className="secondary-button" disabled type="button">
                          {recommendation.action.label}
                        </button>
                      )}
                      <small>
                        {recommendation.action.enabled
                          ? "Manual confirmation required"
                          : recommendation.action.disabledReason}
                      </small>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-copy">
              Recommendations will appear after backlog tasks or actionable sync evidence exists.
            </p>
          )}
        </section>

        <section className="panel empty-state" aria-labelledby="synced-content-title">
          <div className="section-heading">
            <div>
              <h2 id="synced-content-title">Synced content</h2>
              <p>Search and review WordPress inventory received from plugin sync.</p>
            </div>
            <span className="metric-pill">{syncedContent.total} items</span>
          </div>

          {activeSite ? (
            <>
              <form className="inventory-filters" method="get">
                <label>
                  <span>Site</span>
                  <select name="site" defaultValue={activeSite.id}>
                    {activeOrganization?.sites.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Search</span>
                  <input
                    name="q"
                    type="search"
                    placeholder="Title, URL, external ID"
                    defaultValue={contentFilters.query}
                  />
                </label>
                <label>
                  <span>Type</span>
                  <select name="type" defaultValue={contentFilters.type}>
                    {contentTypes.map((type) => (
                      <option key={type.value || "all"} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Status</span>
                  <select name="status" defaultValue={contentFilters.status}>
                    {contentStatuses.map((status) => (
                      <option key={status.value || "all"} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="button" type="submit">
                  Apply
                </button>
                <Link className="secondary-button inventory-reset" href="/">
                  Reset
                </Link>
              </form>

              {syncedContent.items.length > 0 ? (
                <>
                  <div className="table-wrap">
                    <table className="content-table">
                      <thead>
                        <tr>
                          <th>Title</th>
                          <th>Type</th>
                          <th>Status</th>
                          <th>Modified</th>
                          <th>Seen</th>
                          <th>Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {syncedContent.items.map((item) => (
                          <tr key={item.id}>
                            <td>
                              <strong>{item.title ?? item.externalId}</strong>
                              <span>{item.url}</span>
                            </td>
                            <td>{item.type.replaceAll("_", " ")}</td>
                            <td>
                              <span className="status-pill">{item.status}</span>
                            </td>
                            <td>
                              <time dateTime={item.modifiedAt}>
                                {formatDateTime(item.modifiedAt)}
                              </time>
                            </td>
                            <td>
                              <span className="stacked-meta">
                                First {formatDateTime(item.firstSeenAt)}
                              </span>
                              <span className="stacked-meta">
                                Last {formatDateTime(item.lastSeenAt)}
                              </span>
                            </td>
                            <td>
                              <Link
                                className="text-button"
                                href={buildContentHref(params, {
                                  site: activeSite.id,
                                  content: item.id
                                })}
                              >
                                Open
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {syncedContent.nextCursor ? (
                    <div className="pagination-row">
                      <Link
                        className="secondary-button"
                        href={buildContentHref(params, {
                          site: activeSite.id,
                          cursor: syncedContent.nextCursor
                        })}
                      >
                        Next page
                      </Link>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="empty-copy">No content matches the current inventory filters.</p>
              )}

              {selectedContentId ? (
                <div className="content-detail-panel" aria-labelledby="content-detail-title">
                  {selectedContentItem ? (
                    <>
                      <div className="section-heading">
                        <div>
                          <h3 id="content-detail-title">
                            {selectedContentItem.title ?? selectedContentItem.externalId}
                          </h3>
                          <p>{selectedContentItem.url}</p>
                        </div>
                        <Link
                          className="secondary-button inventory-reset"
                          href={buildContentHref(params, {
                            content: null
                          })}
                        >
                          Close
                        </Link>
                      </div>

                      <dl className="detail-grid">
                        <div>
                          <dt>External ID</dt>
                          <dd>{selectedContentItem.externalId}</dd>
                        </div>
                        <div>
                          <dt>Type</dt>
                          <dd>{selectedContentItem.type.replaceAll("_", " ")}</dd>
                        </div>
                        <div>
                          <dt>Status</dt>
                          <dd>
                            <span className="status-pill">{selectedContentItem.status}</span>
                          </dd>
                        </div>
                        <div>
                          <dt>Modified</dt>
                          <dd>{formatDateTime(selectedContentItem.modifiedAt)}</dd>
                        </div>
                        <div>
                          <dt>Published</dt>
                          <dd>
                            {formatOptionalDateTime(selectedContentItem.metadata.publishedAt)}
                          </dd>
                        </div>
                        <div>
                          <dt>Author</dt>
                          <dd>{formatSyncedContentAuthor(selectedContentItem.metadata)}</dd>
                        </div>
                        <div>
                          <dt>Word count</dt>
                          <dd>{formatOptionalNumber(selectedContentItem.metadata.wordCount)}</dd>
                        </div>
                        <div>
                          <dt>Internal links</dt>
                          <dd>
                            {formatOptionalNumber(selectedContentItem.metadata.internalLinkCount)}
                          </dd>
                        </div>
                        <div>
                          <dt>Outbound links</dt>
                          <dd>
                            {formatOptionalNumber(selectedContentItem.metadata.externalLinkCount)}
                          </dd>
                        </div>
                        <div>
                          <dt>SEO title</dt>
                          <dd>{formatOptionalText(selectedContentItem.metadata.seoTitle)}</dd>
                        </div>
                        <div>
                          <dt>Meta description</dt>
                          <dd>
                            {formatOptionalText(selectedContentItem.metadata.metaDescription)}
                          </dd>
                        </div>
                        <div>
                          <dt>Canonical</dt>
                          <dd>{formatOptionalText(selectedContentItem.metadata.canonicalUrl)}</dd>
                        </div>
                        <div>
                          <dt>Robots</dt>
                          <dd>{formatRobots(selectedContentItem.metadata)}</dd>
                        </div>
                        <div>
                          <dt>SEO source</dt>
                          <dd>{formatSeoSource(selectedContentItem.metadata)}</dd>
                        </div>
                        <div>
                          <dt>Featured image</dt>
                          <dd>{formatFeaturedImage(selectedContentItem.metadata)}</dd>
                        </div>
                        <div>
                          <dt>Taxonomies</dt>
                          <dd>{formatTaxonomies(selectedContentItem.metadata)}</dd>
                        </div>
                        <div>
                          <dt>First seen</dt>
                          <dd>{formatDateTime(selectedContentItem.firstSeenAt)}</dd>
                        </div>
                        <div>
                          <dt>Last seen</dt>
                          <dd>{formatDateTime(selectedContentItem.lastSeenAt)}</dd>
                        </div>
                      </dl>

                      <div className="health-signal-list" aria-label="Content health signals">
                        {selectedContentHealthSignals.map((signal) => (
                          <article
                            className={`health-signal health-signal-${signal.severity}`}
                            key={signal.id}
                          >
                            <span>{signal.severity}</span>
                            <strong>{signal.label}</strong>
                            <p>{signal.message}</p>
                          </article>
                        ))}
                      </div>

                      <div className="candidate-task-list" aria-label="Backlog candidate tasks">
                        <div className="candidate-task-heading">
                          <h4>Candidate tasks</h4>
                          <span>{selectedContentBacklogCandidates.length}</span>
                        </div>
                        {selectedContentBacklogCandidates.length > 0 ? (
                          selectedContentBacklogCandidates.map((candidate) => (
                            <article className="candidate-task" key={candidate.id}>
                              <div>
                                <span className={`priority-pill priority-${candidate.priority}`}>
                                  {candidate.priority}
                                </span>
                                <strong>{candidate.title}</strong>
                              </div>
                              <p>{candidate.rationale}</p>
                              <p>{candidate.nextStep}</p>
                              <form action={createBacklogTaskFromCandidateAction}>
                                <input
                                  name="organizationId"
                                  type="hidden"
                                  value={selectedContentItem.organizationId}
                                />
                                <input
                                  name="siteId"
                                  type="hidden"
                                  value={selectedContentItem.siteId}
                                />
                                <input
                                  name="contentItemId"
                                  type="hidden"
                                  value={selectedContentItem.id}
                                />
                                <input name="candidateId" type="hidden" value={candidate.id} />
                                <input
                                  name="redirectTo"
                                  type="hidden"
                                  value={buildContentHref(params, {
                                    site: activeSite.id,
                                    content: selectedContentItem.id
                                  })}
                                />
                                <button className="secondary-button" type="submit">
                                  Create task
                                </button>
                              </form>
                            </article>
                          ))
                        ) : (
                          <p className="empty-copy">
                            No candidate tasks generated from the current metadata signals.
                          </p>
                        )}
                      </div>

                      <div className="detail-actions">
                        <a
                          className="secondary-button inventory-reset"
                          href={selectedContentItem.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Visit URL
                        </a>
                        <span className="muted-text">
                          Signals are computed from synced WordPress metadata.
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="section-heading">
                      <div>
                        <h3 id="content-detail-title">Content item not found</h3>
                        <p>The selected item is not available for this site.</p>
                      </div>
                      <Link
                        className="secondary-button inventory-reset"
                        href={buildContentHref(params, {
                          content: null
                        })}
                      >
                        Clear
                      </Link>
                    </div>
                  )}
                </div>
              ) : null}
            </>
          ) : (
            <p className="empty-copy">Add a WordPress site before syncing content.</p>
          )}
        </section>

        <section className="panel empty-state" aria-labelledby="audits-title">
          <div className="section-heading">
            <div>
              <h2 id="audits-title">Audits</h2>
              <p>Recent audit runs for the selected WordPress site.</p>
            </div>
            <span className="metric-pill">{auditRuns.length} recent</span>
          </div>

          {activeOrganization && activeSite ? (
            <>
              <div className="audit-actions">
                <form action={createAuditForSiteAction}>
                  <input name="organizationId" type="hidden" value={activeOrganization.id} />
                  <input name="siteId" type="hidden" value={activeSite.id} />
                  <input
                    name="redirectTo"
                    type="hidden"
                    value={buildContentHref(params, {
                      site: activeSite.id
                    })}
                  />
                  <button className="button" type="submit">
                    Run metadata audit
                  </button>
                </form>
                <span className="muted-text">
                  The MVP completes a metadata audit from synced WordPress evidence.
                </span>
              </div>

              {auditRuns.length > 0 ? (
                <div className="table-wrap">
                  <table className="audit-table">
                    <thead>
                      <tr>
                        <th>Status</th>
                        <th>Created</th>
                        <th>Started</th>
                        <th>Completed</th>
                        <th>Issues</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditRuns.map((audit) => (
                        <tr key={audit.id}>
                          <td>
                            <span
                              className={`audit-status audit-status-${audit.status.toLowerCase()}`}
                            >
                              {audit.status.toLowerCase()}
                            </span>
                          </td>
                          <td>
                            <time dateTime={audit.createdAt}>
                              {formatDateTime(audit.createdAt)}
                            </time>
                          </td>
                          <td>
                            {audit.startedAt ? (
                              <time dateTime={audit.startedAt}>
                                {formatDateTime(audit.startedAt)}
                              </time>
                            ) : (
                              <span className="muted-text">Not started</span>
                            )}
                          </td>
                          <td>
                            {audit.completedAt ? (
                              <time dateTime={audit.completedAt}>
                                {formatDateTime(audit.completedAt)}
                              </time>
                            ) : (
                              <span className="muted-text">Pending</span>
                            )}
                          </td>
                          <td>
                            <strong>{formatAuditIssueTotal(audit.issueSummary.total)}</strong>
                            <span className="stacked-meta">
                              {audit.issueSummary.open} open / {audit.issueSummary.high} high /{" "}
                              {audit.issueSummary.critical} critical
                            </span>
                            <Link
                              className="text-button"
                              href={buildContentHref(params, {
                                site: activeSite.id,
                                audit: audit.id
                              })}
                            >
                              Open issues
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="empty-copy">No audit runs yet for this site.</p>
              )}

              {activeAudit ? (
                <div className="audit-issue-panel" aria-labelledby="audit-issues-title">
                  <div className="section-heading">
                    <div>
                      <h3 id="audit-issues-title">Audit issues</h3>
                      <p>
                        {auditIssues.length} findings for audit queued{" "}
                        {formatDateTime(activeAudit.createdAt)}.
                      </p>
                    </div>
                    <div className="audit-issue-heading-actions">
                      <span
                        className={`audit-status audit-status-${activeAudit.status.toLowerCase()}`}
                      >
                        {activeAudit.status.toLowerCase()}
                      </span>
                      <form action={createBacklogTasksFromAuditAction}>
                        <input name="organizationId" type="hidden" value={activeOrganization.id} />
                        <input name="siteId" type="hidden" value={activeSite.id} />
                        <input name="auditId" type="hidden" value={activeAudit.id} />
                        <input name="status" type="hidden" value="OPEN" />
                        <input
                          name="redirectTo"
                          type="hidden"
                          value={buildContentHref(params, {
                            site: activeSite.id,
                            audit: activeAudit.id
                          })}
                        />
                        <button
                          className="secondary-button"
                          disabled={auditIssueSummary.open === 0}
                          type="submit"
                        >
                          Create tasks from open
                        </button>
                      </form>
                    </div>
                  </div>

                  <div className="audit-issue-summary" aria-label="Audit issue summary">
                    <span>Total {auditIssueSummary.total}</span>
                    <span>Open {auditIssueSummary.open}</span>
                    <span>Resolved {auditIssueSummary.resolved}</span>
                    <span>High {auditIssueSummary.high}</span>
                    <span>Critical {auditIssueSummary.critical}</span>
                  </div>

                  <form className="audit-issue-filters" action="/" method="get">
                    <input name="site" type="hidden" value={activeSite.id} />
                    <input name="audit" type="hidden" value={activeAudit.id} />
                    <label>
                      <span>Search</span>
                      <input
                        defaultValue={auditIssueFilters.query}
                        name="auditIssueQ"
                        placeholder="Issue, URL, action"
                        type="search"
                      />
                    </label>
                    <label>
                      <span>Status</span>
                      <select name="auditIssueStatus" defaultValue={auditIssueFilters.status ?? ""}>
                        <option value="">All statuses</option>
                        {auditIssueStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status.toLowerCase()}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Severity</span>
                      <select
                        name="auditIssueSeverity"
                        defaultValue={auditIssueFilters.severity ?? ""}
                      >
                        <option value="">All severities</option>
                        {backlogSeverities.map((severity) => (
                          <option key={severity} value={severity}>
                            {severity}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button className="secondary-button" type="submit">
                      Filter
                    </button>
                    <Link
                      className="secondary-button inventory-reset"
                      href={buildContentHref(params, {
                        site: activeSite.id,
                        audit: activeAudit.id,
                        auditIssueQ: null,
                        auditIssueStatus: null,
                        auditIssueSeverity: null
                      })}
                    >
                      Reset
                    </Link>
                    <Link
                      className="secondary-button"
                      href={buildAuditIssueExportHref({
                        organizationId: activeOrganization.id,
                        siteId: activeSite.id,
                        auditId: activeAudit.id,
                        query: auditIssueFilters.query,
                        status: auditIssueFilters.status,
                        severity: auditIssueFilters.severity
                      })}
                    >
                      Export CSV
                    </Link>
                  </form>

                  {auditIssues.length > 0 ? (
                    <div className="table-wrap">
                      <table className="audit-issue-table">
                        <thead>
                          <tr>
                            <th>Issue</th>
                            <th>Status</th>
                            <th>Severity</th>
                            <th>Backlog</th>
                          </tr>
                        </thead>
                        <tbody>
                          {auditIssues.map((issue) => (
                            <tr key={issue.id}>
                              <td>
                                <strong>{issue.recommendedAction}</strong>
                                <span>{issue.affectedUrl}</span>
                                <span>{issue.issueType.replaceAll("_", " ")}</span>
                              </td>
                              <td>
                                <form className="status-form" action={updateAuditIssueStatusAction}>
                                  <input
                                    name="organizationId"
                                    type="hidden"
                                    value={issue.organizationId}
                                  />
                                  <input name="siteId" type="hidden" value={issue.siteId} />
                                  <input name="auditId" type="hidden" value={issue.auditId} />
                                  <input name="issueId" type="hidden" value={issue.id} />
                                  <input
                                    name="redirectTo"
                                    type="hidden"
                                    value={buildContentHref(params, {
                                      site: activeSite.id,
                                      audit: activeAudit.id
                                    })}
                                  />
                                  <select name="status" defaultValue={issue.status}>
                                    {auditIssueStatuses.map((status) => (
                                      <option key={status} value={status}>
                                        {status.toLowerCase()}
                                      </option>
                                    ))}
                                  </select>
                                  <button className="secondary-button" type="submit">
                                    Apply
                                  </button>
                                </form>
                              </td>
                              <td>
                                <span
                                  className={`severity-pill severity-${issue.severity.toLowerCase()}`}
                                >
                                  {issue.severity}
                                </span>
                              </td>
                              <td>
                                <form action={createBacklogTaskFromAuditIssueAction}>
                                  <input
                                    name="organizationId"
                                    type="hidden"
                                    value={issue.organizationId}
                                  />
                                  <input name="siteId" type="hidden" value={issue.siteId} />
                                  <input name="auditIssueId" type="hidden" value={issue.id} />
                                  <input
                                    name="redirectTo"
                                    type="hidden"
                                    value={buildContentHref(params, {
                                      site: activeSite.id,
                                      audit: activeAudit.id
                                    })}
                                  />
                                  <button className="secondary-button" type="submit">
                                    Create task
                                  </button>
                                </form>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="empty-copy">No issues have been attached to this audit yet.</p>
                  )}
                </div>
              ) : null}
            </>
          ) : (
            <p className="empty-copy">Add a WordPress site before queueing audits.</p>
          )}
        </section>

        <section className="panel empty-state" aria-labelledby="backlog-title">
          <div className="section-heading">
            <div>
              <h2 id="backlog-title">Backlog</h2>
              <p>Persisted SEO tasks created from synced content candidates.</p>
            </div>
            <span className="metric-pill">{backlogTasks.summary.total} tasks</span>
          </div>

          {activeSite ? (
            <>
              <div className="backlog-summary" aria-label="Backlog summary">
                <span>Open {backlogTasks.summary.open}</span>
                <span>Done {backlogTasks.summary.done}</span>
                <span>High {backlogTasks.summary.bySeverity.HIGH}</span>
                <span>Critical {backlogTasks.summary.bySeverity.CRITICAL}</span>
              </div>

              <form className="backlog-filters" action="/" method="get">
                <input name="site" type="hidden" value={activeSite.id} />
                {contentFilters.query ? (
                  <input name="q" type="hidden" value={contentFilters.query} />
                ) : null}
                {contentFilters.type ? (
                  <input name="type" type="hidden" value={contentFilters.type} />
                ) : null}
                {contentFilters.status ? (
                  <input name="status" type="hidden" value={contentFilters.status} />
                ) : null}
                {selectedContentId ? (
                  <input name="content" type="hidden" value={selectedContentId} />
                ) : null}
                <label>
                  <span>Search</span>
                  <input
                    defaultValue={backlogFilters.query}
                    name="backlogQ"
                    placeholder="Title, URL, issue"
                    type="search"
                  />
                </label>
                <label>
                  <span>Status</span>
                  <select name="backlogStatus" defaultValue={backlogFilters.status ?? ""}>
                    <option value="">All statuses</option>
                    {backlogStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Severity</span>
                  <select name="backlogSeverity" defaultValue={backlogFilters.severity ?? ""}>
                    <option value="">All severities</option>
                    {backlogSeverities.map((severity) => (
                      <option key={severity} value={severity}>
                        {severity}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="secondary-button" type="submit">
                  Filter
                </button>
                <Link
                  className="secondary-button"
                  href={buildContentHref(params, {
                    backlogQ: null,
                    backlogStatus: null,
                    backlogSeverity: null
                  })}
                >
                  Reset
                </Link>
                {activeOrganization ? (
                  <Link
                    className="secondary-button"
                    href={buildBacklogExportHref({
                      organizationId: activeOrganization.id,
                      siteId: activeSite.id,
                      query: backlogFilters.query,
                      status: backlogFilters.status,
                      severity: backlogFilters.severity
                    })}
                  >
                    Export CSV
                  </Link>
                ) : null}
              </form>

              {backlogTasks.items.length > 0 ? (
                <div className="table-wrap">
                  <table className="backlog-table">
                    <thead>
                      <tr>
                        <th>Task</th>
                        <th>Status</th>
                        <th>Assignment</th>
                        <th>Severity</th>
                        <th>Effort</th>
                        <th>Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {backlogTasks.items.map((task) => (
                        <tr key={task.id}>
                          <td>
                            <strong>{task.title}</strong>
                            <span>{task.url}</span>
                            <span>{task.issueType.replaceAll("_", " ")}</span>
                            {task.comments.length > 0 ? (
                              <div className="backlog-comments" aria-label="Recent comments">
                                {task.comments.map((comment) => (
                                  <article key={comment.id}>
                                    <strong>{comment.authorName ?? comment.authorEmail}</strong>
                                    <p>{comment.body}</p>
                                    <time dateTime={comment.createdAt}>
                                      {formatDateTime(comment.createdAt)}
                                    </time>
                                  </article>
                                ))}
                              </div>
                            ) : null}
                            {task.activityLogs?.length ? (
                              <div className="backlog-activity" aria-label="Change history">
                                <strong>Change history</strong>
                                <ul>
                                  {task.activityLogs.map((log) => (
                                    <li key={log.id}>
                                      <span>{formatBacklogActivity(log)}</span>
                                      <time dateTime={log.createdAt}>
                                        {formatDateTime(log.createdAt)}
                                      </time>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}
                            <form
                              className="preview-form"
                              action={createBulkOperationPreviewAction}
                            >
                              <input
                                name="organizationId"
                                type="hidden"
                                value={task.organizationId}
                              />
                              <input name="siteId" type="hidden" value={task.siteId} />
                              <input name="taskId" type="hidden" value={task.id} />
                              <input
                                name="redirectTo"
                                type="hidden"
                                value={buildContentHref(params, {
                                  site: activeSite.id
                                })}
                              />
                              <button className="secondary-button" type="submit">
                                Preview
                              </button>
                            </form>
                            <form className="comment-form" action={createBacklogTaskCommentAction}>
                              <input
                                name="organizationId"
                                type="hidden"
                                value={task.organizationId}
                              />
                              <input name="siteId" type="hidden" value={task.siteId} />
                              <input name="taskId" type="hidden" value={task.id} />
                              <input
                                name="redirectTo"
                                type="hidden"
                                value={buildContentHref(params, {
                                  site: activeSite.id
                                })}
                              />
                              <textarea
                                aria-label="Comment"
                                maxLength={2000}
                                name="body"
                                required
                                rows={2}
                              />
                              <button className="secondary-button" type="submit">
                                Comment
                              </button>
                            </form>
                          </td>
                          <td>
                            <form className="status-form" action={updateBacklogTaskStatusAction}>
                              <input
                                name="organizationId"
                                type="hidden"
                                value={task.organizationId}
                              />
                              <input name="siteId" type="hidden" value={task.siteId} />
                              <input name="taskId" type="hidden" value={task.id} />
                              <input
                                name="redirectTo"
                                type="hidden"
                                value={buildContentHref(params, {
                                  site: activeSite.id
                                })}
                              />
                              <select name="status" defaultValue={task.status}>
                                {backlogStatuses.map((status) => (
                                  <option key={status} value={status}>
                                    {status.replaceAll("_", " ")}
                                  </option>
                                ))}
                              </select>
                              <button className="secondary-button" type="submit">
                                Apply
                              </button>
                            </form>
                          </td>
                          <td>
                            <form
                              className="assignment-form"
                              action={updateBacklogTaskAssignmentAction}
                            >
                              <input
                                name="organizationId"
                                type="hidden"
                                value={task.organizationId}
                              />
                              <input name="siteId" type="hidden" value={task.siteId} />
                              <input name="taskId" type="hidden" value={task.id} />
                              <input
                                name="redirectTo"
                                type="hidden"
                                value={buildContentHref(params, {
                                  site: activeSite.id
                                })}
                              />
                              <select name="assigneeId" defaultValue={task.assigneeId ?? ""}>
                                <option value="">Unassigned</option>
                                {assignableMembers.map((member) => (
                                  <option key={member.userId} value={member.userId}>
                                    {member.name ?? member.email}
                                  </option>
                                ))}
                              </select>
                              <input
                                aria-label="Due date"
                                defaultValue={formatDateInput(task.dueDate)}
                                name="dueDate"
                                type="date"
                              />
                              <button className="secondary-button" type="submit">
                                Apply
                              </button>
                            </form>
                          </td>
                          <td>
                            <span
                              className={`severity-pill severity-${task.severity.toLowerCase()}`}
                            >
                              {task.severity}
                            </span>
                          </td>
                          <td>{task.effortEstimate ?? "n/a"}</td>
                          <td>
                            <time dateTime={task.updatedAt}>{formatDateTime(task.updatedAt)}</time>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="empty-copy">
                  {backlogTasks.summary.total > 0
                    ? "No backlog tasks match the selected filters."
                    : "No backlog tasks yet. Create one from a synced content candidate."}
                </p>
              )}

              {bulkOperations.length > 0 ? (
                <div className="bulk-preview-panel" aria-label="Recent safe operation previews">
                  <h3>Recent previews</h3>
                  <div className="bulk-preview-list">
                    {bulkOperations.map((operation) => (
                      <article key={operation.id}>
                        <div>
                          <strong>{operation.type.replaceAll("_", " ")}</strong>
                          <span>{formatBulkOperationPreview(operation.preview)}</span>
                          {operation.dryRunResult ? (
                            <span>{formatBulkOperationDryRun(operation.dryRunResult)}</span>
                          ) : null}
                          <span>
                            {formatBulkOperationItemStatusSummary(
                              operation.itemStatusSummary,
                              operation.items
                            )}
                          </span>
                          {operation.retryMode ? (
                            <span>
                              {formatBulkOperationRetryMode(operation.retryMode, operation.status)}
                            </span>
                          ) : null}
                        </div>
                        <span className="status-pill">{operation.status.replaceAll("_", " ")}</span>
                        <time dateTime={operation.createdAt}>
                          {formatDateTime(operation.createdAt)}
                        </time>
                        {operation.status === "PREVIEWED" ? (
                          <form action={runBulkOperationDryRunAction}>
                            <input
                              name="organizationId"
                              type="hidden"
                              value={operation.organizationId}
                            />
                            <input name="siteId" type="hidden" value={operation.siteId} />
                            <input name="operationId" type="hidden" value={operation.id} />
                            <input
                              name="redirectTo"
                              type="hidden"
                              value={buildContentHref(params, {
                                site: activeSite.id
                              })}
                            />
                            <button className="secondary-button" type="submit">
                              Dry run
                            </button>
                          </form>
                        ) : null}
                        {operation.status === "DRY_RUN_PASSED" ? (
                          <form className="confirm-form" action={confirmBulkOperationAction}>
                            <input
                              name="organizationId"
                              type="hidden"
                              value={operation.organizationId}
                            />
                            <input name="siteId" type="hidden" value={operation.siteId} />
                            <input name="operationId" type="hidden" value={operation.id} />
                            <input
                              name="redirectTo"
                              type="hidden"
                              value={buildContentHref(params, {
                                site: activeSite.id
                              })}
                            />
                            <input
                              aria-label="Confirmation"
                              autoComplete="off"
                              name="confirmation"
                              pattern="CONFIRM"
                              placeholder="CONFIRM"
                              required
                              type="text"
                            />
                            <button className="secondary-button" type="submit">
                              Confirm
                            </button>
                          </form>
                        ) : null}
                        {operation.status === "CONFIRMED" ? (
                          <form action={startBulkOperationAction}>
                            <input
                              name="organizationId"
                              type="hidden"
                              value={operation.organizationId}
                            />
                            <input name="siteId" type="hidden" value={operation.siteId} />
                            <input name="operationId" type="hidden" value={operation.id} />
                            <input
                              name="redirectTo"
                              type="hidden"
                              value={buildContentHref(params, {
                                site: activeSite.id
                              })}
                            />
                            <button className="secondary-button" type="submit">
                              Start
                            </button>
                          </form>
                        ) : null}
                        {operation.status === "RUNNING" ? (
                          <>
                            <form action={finishBulkOperationAction}>
                              <input
                                name="organizationId"
                                type="hidden"
                                value={operation.organizationId}
                              />
                              <input name="siteId" type="hidden" value={operation.siteId} />
                              <input name="operationId" type="hidden" value={operation.id} />
                              <input name="status" type="hidden" value="COMPLETED" />
                              <input
                                name="redirectTo"
                                type="hidden"
                                value={buildContentHref(params, {
                                  site: activeSite.id
                                })}
                              />
                              <button className="secondary-button" type="submit">
                                Complete
                              </button>
                            </form>
                            <form action={finishBulkOperationAction}>
                              <input
                                name="organizationId"
                                type="hidden"
                                value={operation.organizationId}
                              />
                              <input name="siteId" type="hidden" value={operation.siteId} />
                              <input name="operationId" type="hidden" value={operation.id} />
                              <input name="status" type="hidden" value="FAILED" />
                              <input
                                name="message"
                                type="hidden"
                                value="Marked failed from the SaaS dashboard."
                              />
                              <input
                                name="redirectTo"
                                type="hidden"
                                value={buildContentHref(params, {
                                  site: activeSite.id
                                })}
                              />
                              <button className="secondary-button" type="submit">
                                Mark failed
                              </button>
                            </form>
                          </>
                        ) : null}
                        {operation.status === "COMPLETED" || operation.status === "FAILED" ? (
                          <form action={rollbackBulkOperationAction}>
                            <input
                              name="organizationId"
                              type="hidden"
                              value={operation.organizationId}
                            />
                            <input name="siteId" type="hidden" value={operation.siteId} />
                            <input name="operationId" type="hidden" value={operation.id} />
                            <input
                              name="reason"
                              type="hidden"
                              value="Rollback requested from the SaaS dashboard."
                            />
                            <input
                              name="redirectTo"
                              type="hidden"
                              value={buildContentHref(params, {
                                site: activeSite.id
                              })}
                            />
                            <button className="secondary-button" type="submit">
                              Roll back
                            </button>
                          </form>
                        ) : null}
                        {operation.status === "FAILED" ? (
                          <form action={retryBulkOperationAction}>
                            <input
                              name="organizationId"
                              type="hidden"
                              value={operation.organizationId}
                            />
                            <input name="siteId" type="hidden" value={operation.siteId} />
                            <input name="operationId" type="hidden" value={operation.id} />
                            <input
                              name="reason"
                              type="hidden"
                              value="Retry failed items from the SaaS dashboard."
                            />
                            <input
                              name="redirectTo"
                              type="hidden"
                              value={buildContentHref(params, {
                                site: activeSite.id
                              })}
                            />
                            <button className="secondary-button" type="submit">
                              Retry failed
                            </button>
                          </form>
                        ) : null}
                      </article>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <p className="empty-copy">Add a WordPress site before building a backlog.</p>
          )}
        </section>

        <section className="panel" aria-labelledby="members-title">
          <div className="section-heading">
            <div>
              <h2 id="members-title">Members</h2>
              <p>Invite teammates and manage non-owner roles inside the current organization.</p>
            </div>
          </div>

          {activeOrganization ? (
            <>
              <InviteMemberForm organizationId={activeOrganization.id} />
              <div className="table-wrap members-table">
                <table>
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Status</th>
                      <th>Role</th>
                      <th>Invite</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeMembers.map((member) => (
                      <tr key={member.id}>
                        <td>
                          <strong>{member.name ?? member.email}</strong>
                          <span>{member.email}</span>
                        </td>
                        <td>
                          <span className="status-pill">{member.status.toLowerCase()}</span>
                        </td>
                        <td>
                          <MemberRoleForm
                            organizationId={activeOrganization.id}
                            member={member}
                            currentUserId={user.id}
                          />
                        </td>
                        <td>
                          <InviteActionsForm
                            organizationId={activeOrganization.id}
                            member={member}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="empty-copy">Create an organization before inviting members.</p>
          )}
        </section>

        <section className="panel" aria-labelledby="billing-title">
          <div className="section-heading">
            <div>
              <h2 id="billing-title">Billing</h2>
              <p>Plan limits and subscription state for the current organization.</p>
            </div>
            {billingOverview ? (
              <span className="metric-pill">{billingOverview.currentPlan.name}</span>
            ) : null}
          </div>

          {billingOverview ? (
            <>
              {billingStatus ? (
                <p className={`billing-feedback billing-feedback-${billingStatus}`}>
                  {formatBillingFeedback(billingStatus, billingMessage)}
                </p>
              ) : null}

              <div className="billing-current">
                <div>
                  <small>Current plan</small>
                  <strong>{billingOverview.currentPlan.name}</strong>
                  <span>{formatPlanPrice(billingOverview.currentPlan)}</span>
                </div>
                <div>
                  <small>Status</small>
                  <strong>{formatSubscriptionStatus(billingOverview.subscription)}</strong>
                  <span>{formatSubscriptionPeriod(billingOverview.subscription)}</span>
                </div>
                <div className="billing-action-cell">
                  {billingOverview.actions.portal.enabled ? (
                    <form action={createBillingPortalSessionAction}>
                      <input
                        type="hidden"
                        name="organizationId"
                        value={activeOrganization?.id ?? ""}
                      />
                      <button className="secondary-button" type="submit">
                        {billingOverview.actions.portal.label}
                      </button>
                    </form>
                  ) : (
                    <>
                      <button className="secondary-button" disabled type="button">
                        {billingOverview.actions.portal.label}
                      </button>
                      <span>{billingOverview.actions.portal.disabledReason}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="billing-gate-grid">
                {billingOverview.featureGates.map((gate) => (
                  <div
                    key={gate.key}
                    className={gate.allowed ? "billing-gate" : "billing-gate billing-gate-blocked"}
                  >
                    <span>{gate.label}</span>
                    <strong>
                      {gate.used.toLocaleString("en")} / {formatLimitValue(gate.limit)}
                    </strong>
                    <small>
                      {gate.allowed
                        ? `${formatLimitValue(gate.remaining)} remaining`
                        : gate.disabledReason}
                    </small>
                  </div>
                ))}
              </div>

              <div className="billing-plan-grid">
                {billingOverview.plans.map((plan) => {
                  const checkoutAction = billingOverview.actions.checkout.find(
                    (action) => action.targetPlanCode === plan.code
                  );

                  return (
                    <article
                      key={plan.id}
                      className={
                        plan.code === billingOverview.currentPlan.code
                          ? "billing-plan billing-plan-current"
                          : "billing-plan"
                      }
                    >
                      <div>
                        <h3>{plan.name}</h3>
                        <strong>{formatPlanPrice(plan)}</strong>
                      </div>
                      <ul>
                        <li>{formatLimitValue(plan.limits.sites)} sites</li>
                        <li>{formatLimitValue(plan.limits.urlsPerSite)} URLs per site</li>
                        <li>{formatLimitValue(plan.limits.users)} users</li>
                        <li>{plan.limits.aiCredits.toLocaleString("en")} AI credits</li>
                        <li>{plan.limits.apiAccess ? "API access" : "No API access"}</li>
                      </ul>
                      {checkoutAction ? (
                        <div className="billing-plan-action">
                          {checkoutAction.enabled ? (
                            <form action={createBillingCheckoutSessionAction}>
                              <input
                                type="hidden"
                                name="organizationId"
                                value={activeOrganization?.id ?? ""}
                              />
                              <input type="hidden" name="planCode" value={plan.code} />
                              <button className="secondary-button" type="submit">
                                {checkoutAction.label}
                              </button>
                            </form>
                          ) : (
                            <>
                              <button className="secondary-button" disabled type="button">
                                {checkoutAction.label}
                              </button>
                              <span>{checkoutAction.disabledReason}</span>
                            </>
                          )}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="empty-copy">Your role can not view billing for this organization.</p>
          )}
        </section>
      </main>
    </div>
  );
}

function readQueryParam(
  params: Record<string, string | string[] | undefined>,
  key: string
): string {
  const value = params[key];
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function readEnumQueryParam<TValue extends string>(
  params: Record<string, string | string[] | undefined>,
  key: string,
  allowedValues: readonly TValue[]
): TValue | undefined {
  const value = readQueryParam(params, key);
  return allowedValues.includes(value as TValue) ? (value as TValue) : undefined;
}

function buildContentHref(
  params: Record<string, string | string[] | undefined>,
  overrides: Record<string, string | null>
): string {
  const nextParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    const normalizedValue = Array.isArray(value) ? value[0] : value;

    if (normalizedValue) {
      nextParams.set(key, normalizedValue);
    }
  }

  for (const [key, value] of Object.entries(overrides)) {
    if (value) {
      nextParams.set(key, value);
    } else {
      nextParams.delete(key);
    }
  }

  const query = nextParams.toString();
  return query ? `/?${query}` : "/";
}

function buildBacklogExportHref(input: {
  organizationId: string;
  siteId: string;
  query?: string;
  status?: string;
  severity?: string;
}): string {
  const params = new URLSearchParams();

  if (input.query) {
    params.set("q", input.query);
  }

  if (input.status) {
    params.set("status", input.status);
  }

  if (input.severity) {
    params.set("severity", input.severity);
  }

  const query = params.toString();
  const path = `/api/organizations/${input.organizationId}/sites/${input.siteId}/backlog/tasks/export`;
  return query ? `${path}?${query}` : path;
}

function buildAuditIssueExportHref(input: {
  organizationId: string;
  siteId: string;
  auditId: string;
  query?: string;
  status?: string;
  severity?: string;
}): string {
  const params = new URLSearchParams();

  if (input.query) {
    params.set("q", input.query);
  }

  if (input.status) {
    params.set("status", input.status);
  }

  if (input.severity) {
    params.set("severity", input.severity);
  }

  const query = params.toString();
  const path = `/api/organizations/${input.organizationId}/sites/${input.siteId}/audits/${input.auditId}/issues/export`;
  return query ? `${path}?${query}` : path;
}

function buildAuditIssueSummary(
  issues: Array<{
    status: (typeof auditIssueStatuses)[number];
    severity: (typeof backlogSeverities)[number];
  }>
) {
  return {
    total: issues.length,
    open: issues.filter((issue) => issue.status === "OPEN").length,
    resolved: issues.filter((issue) => issue.status === "RESOLVED").length,
    high: issues.filter((issue) => issue.severity === "HIGH").length,
    critical: issues.filter((issue) => issue.severity === "CRITICAL").length
  };
}

function formatBacklogActivity(log: {
  action: string;
  metadata: Record<string, string | number | boolean | null>;
}): string {
  if (log.action === "backlog_task.created_from_candidate") {
    return "Task created from synced content";
  }

  if (log.action === "backlog_task.created_from_audit_issue") {
    return "Task created from audit issue";
  }

  if (log.action === "backlog_task.status_updated") {
    return `Status changed from ${formatMetadataValue(log.metadata.previousStatus)} to ${formatMetadataValue(log.metadata.status)}`;
  }

  if (log.action === "backlog_task.assignment_updated") {
    const assignee = formatMetadataValue(log.metadata.assigneeId, "unassigned");
    const dueDate = formatMetadataDate(log.metadata.dueDate);
    return dueDate
      ? `Assignment updated to ${assignee}, due ${dueDate}`
      : `Assignment updated to ${assignee}`;
  }

  if (log.action === "backlog_task.comment_created") {
    return "Comment added";
  }

  return log.action.replaceAll("_", " ");
}

function formatBulkOperationPreview(preview: unknown): string {
  if (typeof preview !== "object" || preview === null || !("summary" in preview)) {
    return "Preview prepared without WordPress changes.";
  }

  const summary = (preview as { summary?: unknown }).summary;
  return typeof summary === "string" ? summary : "Preview prepared without WordPress changes.";
}

function formatBulkOperationDryRun(dryRunResult: unknown): string {
  if (typeof dryRunResult !== "object" || dryRunResult === null) {
    return "Dry run completed without WordPress changes.";
  }

  const result = dryRunResult as {
    status?: unknown;
    passedItems?: unknown;
    failedItems?: unknown;
    noMutation?: unknown;
  };
  const status = typeof result.status === "string" ? result.status : "passed";
  const passedItems = typeof result.passedItems === "number" ? result.passedItems : 0;
  const failedItems = typeof result.failedItems === "number" ? result.failedItems : 0;
  const writeState =
    result.noMutation === true ? "no WordPress writes" : "WordPress writes deferred";

  return `Dry run ${status}: ${passedItems} passed, ${failedItems} failed, ${writeState}.`;
}

type BulkOperationItemStatusSummaryView = {
  total: number;
  previewed: number;
  dryRunPassed: number;
  confirmed: number;
  running: number;
  completed: number;
  failed: number;
  rolledBack: number;
  other: number;
};

function formatBulkOperationItemStatusSummary(
  summary: unknown,
  items: Array<{
    status: string;
  }>
): string {
  const normalized = normalizeBulkOperationItemStatusSummary(summary, items);
  const parts = [
    { label: "previewed", count: normalized.previewed },
    { label: "dry-run", count: normalized.dryRunPassed },
    { label: "confirmed", count: normalized.confirmed },
    { label: "running", count: normalized.running },
    { label: "completed", count: normalized.completed },
    { label: "failed", count: normalized.failed },
    { label: "rolled back", count: normalized.rolledBack },
    { label: "other", count: normalized.other }
  ]
    .filter((part) => part.count > 0)
    .map((part) => `${part.count} ${part.label}`);

  return parts.length > 0
    ? `Items: ${normalized.total} total (${parts.join(", ")}).`
    : `Items: ${normalized.total} total.`;
}

function formatBulkOperationRetryMode(retryMode: unknown, status: string): string {
  if (retryMode === "rollback") {
    return status === "RUNNING"
      ? "Rollback restore in progress."
      : "Retry will restore failed rollback items.";
  }

  if (retryMode === "execute") {
    return status === "RUNNING"
      ? "Execution retry in progress."
      : "Retry will execute failed items.";
  }

  return "";
}

function normalizeBulkOperationItemStatusSummary(
  summary: unknown,
  items: Array<{
    status: string;
  }>
): BulkOperationItemStatusSummaryView {
  if (typeof summary === "object" && summary !== null) {
    const candidate = summary as Partial<Record<keyof BulkOperationItemStatusSummaryView, unknown>>;
    const normalized = {
      total: readNonNegativeCount(candidate.total),
      previewed: readNonNegativeCount(candidate.previewed),
      dryRunPassed: readNonNegativeCount(candidate.dryRunPassed),
      confirmed: readNonNegativeCount(candidate.confirmed),
      running: readNonNegativeCount(candidate.running),
      completed: readNonNegativeCount(candidate.completed),
      failed: readNonNegativeCount(candidate.failed),
      rolledBack: readNonNegativeCount(candidate.rolledBack),
      other: readNonNegativeCount(candidate.other)
    };

    if (normalized.total > 0 || items.length === 0) {
      return normalized;
    }
  }

  return summarizeBulkOperationItems(items);
}

function summarizeBulkOperationItems(
  items: Array<{
    status: string;
  }>
): BulkOperationItemStatusSummaryView {
  const summary: BulkOperationItemStatusSummaryView = {
    total: items.length,
    previewed: 0,
    dryRunPassed: 0,
    confirmed: 0,
    running: 0,
    completed: 0,
    failed: 0,
    rolledBack: 0,
    other: 0
  };

  for (const item of items) {
    switch (item.status) {
      case "PREVIEWED":
        summary.previewed += 1;
        break;
      case "DRY_RUN_PASSED":
        summary.dryRunPassed += 1;
        break;
      case "CONFIRMED":
        summary.confirmed += 1;
        break;
      case "RUNNING":
        summary.running += 1;
        break;
      case "COMPLETED":
        summary.completed += 1;
        break;
      case "FAILED":
        summary.failed += 1;
        break;
      case "ROLLED_BACK":
        summary.rolledBack += 1;
        break;
      default:
        summary.other += 1;
        break;
    }
  }

  return summary;
}

function readNonNegativeCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function formatMetadataValue(
  value: string | number | boolean | null | undefined,
  fallback = "none"
): string {
  return value === null || value === undefined || value === "" ? fallback : String(value);
}

function formatMetadataDate(value: string | number | boolean | null | undefined): string | null {
  if (typeof value !== "string" || !value) {
    return null;
  }

  return value.slice(0, 10);
}

function formatOptionalDateTime(value: string | null | undefined): string {
  return value ? formatDateTime(value) : "n/a";
}

function formatOptionalNumber(value: number | null | undefined): string {
  return typeof value === "number" ? value.toLocaleString("en") : "n/a";
}

function formatGscConnectionCount(overview: GscConnectionOverview): string {
  if (!overview.connected) {
    return "Not connected";
  }

  const count = overview.connections.length;

  return count === 1 ? "1 property" : `${count.toLocaleString("en")} properties`;
}

function formatAuditIssueTotal(total: number): string {
  return total === 1 ? "1 finding" : `${total.toLocaleString("en")} findings`;
}

function formatOptionalText(value: string | null | undefined): string {
  const text = value?.trim() ?? "";

  return text || "n/a";
}

function formatSyncedContentAuthor(metadata: SyncedContentMetadata): string {
  if (metadata.authorName) {
    return metadata.authorId
      ? `${metadata.authorName} (#${metadata.authorId})`
      : metadata.authorName;
  }

  return metadata.authorId ? `Author #${metadata.authorId}` : "n/a";
}

function formatFeaturedImage(metadata: SyncedContentMetadata): string {
  if (!metadata.featuredImagePresent) {
    return "No";
  }

  return metadata.featuredImageId ? `Yes (#${metadata.featuredImageId})` : "Yes";
}

function formatRobots(metadata: SyncedContentMetadata): string {
  const directives = [];

  if (metadata.robotsNoindex !== null && metadata.robotsNoindex !== undefined) {
    directives.push(metadata.robotsNoindex ? "noindex" : "index");
  }

  if (metadata.robotsNofollow !== null && metadata.robotsNofollow !== undefined) {
    directives.push(metadata.robotsNofollow ? "nofollow" : "follow");
  }

  return directives.length > 0 ? directives.join(", ") : "n/a";
}

function formatSeoSource(metadata: SyncedContentMetadata): string {
  return metadata.seoPlugin ? metadata.seoPlugin.replaceAll("_", " ") : "n/a";
}

function formatTaxonomies(metadata: SyncedContentMetadata): string {
  const taxonomies = metadata.taxonomies ?? [];

  if (!taxonomies.length) {
    return "n/a";
  }

  return taxonomies
    .map((taxonomy) => `${taxonomy.taxonomy}: ${taxonomy.terms.join(", ")}`)
    .join("; ");
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatPlanPrice(plan: { code: string; monthlyPrice: number }): string {
  if (plan.code === "ENTERPRISE" && plan.monthlyPrice === 0) {
    return "Custom";
  }

  return `$${(plan.monthlyPrice / 100).toLocaleString("en", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  })}/mo`;
}

function formatBillingFeedback(status: (typeof billingStatuses)[number], message: string): string {
  if (status === "success") {
    return "Checkout completed. Subscription updates will appear after provider confirmation.";
  }

  if (status === "cancel") {
    return "Checkout was canceled.";
  }

  if (status === "portal_return") {
    return "Returned from billing portal. Subscription updates will appear after provider confirmation.";
  }

  return message || "Checkout could not be started.";
}

function formatGscFeedback(status: (typeof gscStatuses)[number], message: string): string {
  if (status === "connected") {
    return "Google Search Console connection completed.";
  }

  if (status === "metrics_synced") {
    return "Google Search Console metrics synced.";
  }

  if (status === "insights_synced") {
    return "Google Search Console insights synced.";
  }

  if (status === "property_selected") {
    return "Google Search Console property selected.";
  }

  return message || "Google Search Console connection could not be completed.";
}

function formatGscCtr(metric: GscDailyMetric | GscSearchInsight): string {
  return `${(metric.ctr * 100).toLocaleString("en", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  })}%`;
}

function formatGscPosition(metric: GscDailyMetric | GscSearchInsight): string {
  return metric.position.toLocaleString("en", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0
  });
}

function formatTrafficLossDelta(loss: SiteTrafficLoss): string {
  const delta = loss.clicksDelta.toLocaleString("en", { signDisplay: "always" });
  const ratio = `${(loss.clicksDropRatio * 100).toLocaleString("en", {
    maximumFractionDigits: 1
  })}%`;

  return loss.clicksDelta < 0 ? `${delta} clicks, -${ratio}` : `${delta} clicks`;
}

function formatSubscriptionStatus(subscription: BillingSubscription | null): string {
  return subscription ? subscription.status.replaceAll("_", " ") : "TRIAL";
}

function formatSubscriptionPeriod(subscription: BillingSubscription | null): string {
  if (!subscription) {
    return "No paid subscription connected";
  }

  if (subscription.provider === null && subscription.trialEndsAt) {
    return subscription.status === "PAST_DUE"
      ? `Trial expired ${formatDateTime(subscription.trialEndsAt)}`
      : `Trial ends ${formatDateTime(subscription.trialEndsAt)}`;
  }

  if (subscription.currentPeriodEnd) {
    return `Renews ${formatDateTime(subscription.currentPeriodEnd)}`;
  }

  return "Subscription period not available";
}

function formatLimitValue(value: number | "custom"): string {
  return value === "custom" ? "Custom" : value.toLocaleString("en");
}

function formatDateInput(value: string | null): string {
  return value ? value.slice(0, 10) : "";
}

function canDisconnectSiteStatus(status: Site["status"]): boolean {
  return status === "CONNECTED" || status === "SYNCING" || status === "ERROR";
}
