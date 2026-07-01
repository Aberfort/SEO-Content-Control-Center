import Link from "next/link";
import { redirect } from "next/navigation";

import { createBacklogTaskFromCandidateAction, updateBacklogTaskStatusAction } from "@/app/actions";
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

const backlogStatuses = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "SNOOZED", "IGNORED"];

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
  const selectedContentId = readQueryParam(params, "content");
  const activeMembers = activeOrganization
    ? await repository.listMembersForOrganization(user.id, activeOrganization.id)
    : [];
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
      ? await repository.listBacklogTasksForSite(user.id, activeOrganization.id, activeSite.id)
      : [];
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

        <section className="panel empty-state" aria-labelledby="backlog-title">
          <div className="section-heading">
            <div>
              <h2 id="backlog-title">Backlog</h2>
              <p>Persisted SEO tasks created from synced content candidates.</p>
            </div>
            <span className="metric-pill">{backlogTasks.length} tasks</span>
          </div>

          {activeSite && backlogTasks.length > 0 ? (
            <div className="table-wrap">
              <table className="backlog-table">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Status</th>
                    <th>Severity</th>
                    <th>Effort</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {backlogTasks.map((task) => (
                    <tr key={task.id}>
                      <td>
                        <strong>{task.title}</strong>
                        <span>{task.url}</span>
                        <span>{task.issueType.replaceAll("_", " ")}</span>
                      </td>
                      <td>
                        <form className="status-form" action={updateBacklogTaskStatusAction}>
                          <input name="organizationId" type="hidden" value={task.organizationId} />
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
                        <span className={`severity-pill severity-${task.severity.toLowerCase()}`}>
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
              {activeSite
                ? "No backlog tasks yet. Create one from a synced content candidate."
                : "Add a WordPress site before building a backlog."}
            </p>
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

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
