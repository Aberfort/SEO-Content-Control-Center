import Link from "next/link";
import { redirect } from "next/navigation";

import { CreateOrganizationForm } from "@/components/create-organization-form";
import { CreateSiteForm } from "@/components/create-site-form";
import { InviteMemberForm } from "@/components/invite-member-form";
import { LogoutButton } from "@/components/logout-button";
import { MemberRoleForm } from "@/components/member-role-form";
import { getAppRepository } from "@/lib/app-repository";
import { getCurrentUser } from "@/lib/auth";

const navItems = ["Dashboard", "Sites", "Audits", "Backlog", "Integrations", "Billing"];

export default async function AppHomePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  const repository = getAppRepository();
  const organizations = await repository.listOrganizationSummariesForUser(user);
  const activeOrganization = organizations[0] ?? null;
  const activeMembers = activeOrganization
    ? await repository.listMembersForOrganization(user.id, activeOrganization.id)
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
