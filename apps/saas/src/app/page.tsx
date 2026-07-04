import Link from "next/link";
import { redirect } from "next/navigation";

import {
  confirmBulkOperationAction,
  createAuditForSiteAction,
  createBacklogTaskCommentAction,
  createBacklogTaskFromAuditIssueAction,
  createBacklogTaskFromCandidateAction,
  createBulkOperationPreviewAction,
  runBulkOperationDryRunAction,
  updateAuditIssueStatusAction,
  updateBacklogTaskAssignmentAction,
  updateBacklogTaskStatusAction
} from "@/app/actions";
import { CreateOrganizationForm } from "@/components/create-organization-form";
import { CreateSiteForm } from "@/components/create-site-form";
import { InviteActionsForm } from "@/components/invite-actions-form";
import { InviteMemberForm } from "@/components/invite-member-form";
import { LogoutButton } from "@/components/logout-button";
import { MemberRoleForm } from "@/components/member-role-form";
import { getAppRepository } from "@/lib/app-repository";
import { getCurrentUser } from "@/lib/auth";
import {
  buildSyncedContentBacklogCandidates,
  buildSyncedContentHealthSignals
} from "@/lib/content-health";

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
  const selectedContentId = readQueryParam(params, "content");
  const selectedAuditId = readQueryParam(params, "audit");
  const activeMembers = activeOrganization
    ? await repository.listMembersForOrganization(user.id, activeOrganization.id)
    : [];
  const assignableMembers = activeMembers.filter((member) => member.status === "ACTIVE");
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

        <section className="workspace-grid" aria-label="Workspace setup forms">
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
                    Queue audit
                  </button>
                </form>
                <span className="muted-text">
                  The MVP creates a queued run; crawling will attach issues later.
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
                    <span
                      className={`audit-status audit-status-${activeAudit.status.toLowerCase()}`}
                    >
                      {activeAudit.status.toLowerCase()}
                    </span>
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
  const noMutation = result.noMutation === true ? "no WordPress writes" : "no writes";

  return `Dry run ${status}: ${passedItems} passed, ${failedItems} failed, ${noMutation}.`;
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

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatDateInput(value: string | null): string {
  return value ? value.slice(0, 10) : "";
}
