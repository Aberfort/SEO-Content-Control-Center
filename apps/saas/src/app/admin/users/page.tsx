import { redirect } from "next/navigation";

import { getAppRepository } from "@/lib/app-repository";
import { getCurrentUser } from "@/lib/auth";
import { isPlatformAdmin } from "@/lib/platform-admin";

/**
 * Owner-only: every registered user across every organization, newest
 * first, so a new signup can be spotted without querying the database
 * directly. Gated by SCCC_PLATFORM_ADMIN_EMAILS, same as /admin/grants.
 */
export default async function PlatformUsersAdminPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login?next=%2Fadmin%2Fusers");
  }

  if (!isPlatformAdmin(user.email)) {
    redirect("/");
  }

  const users = await getAppRepository().listUsersForPlatformAdmin();

  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const newLast7Days = users.filter((u) => new Date(u.createdAt).getTime() >= sevenDaysAgo).length;
  const newLast30Days = users.filter(
    (u) => new Date(u.createdAt).getTime() >= thirtyDaysAgo
  ).length;

  return (
    <main className="admin-users-page">
      <header className="section-heading">
        <span className="eyebrow">Owner tools</span>
        <h1>Users</h1>
        <p>Every registered user, newest first. Use this to spot new signups at a glance.</p>
      </header>

      <section className="panel">
        <h2>Overview</h2>
        <p>
          {users.length} total &middot; {newLast7Days} new in the last 7 days &middot;{" "}
          {newLast30Days} new in the last 30 days
        </p>
      </section>

      <section className="panel">
        <h2>All users</h2>
        {users.length === 0 ? (
          <p>No users yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Registered</th>
                  <th>Verified</th>
                  <th>Organizations</th>
                </tr>
              </thead>
              <tbody>
                {users.map((platformUser) => {
                  const isNew = new Date(platformUser.createdAt).getTime() >= sevenDaysAgo;

                  return (
                    <tr key={platformUser.id}>
                      <td>
                        {platformUser.email}
                        {isNew ? " 🆕" : null}
                      </td>
                      <td>{platformUser.name ?? "—"}</td>
                      <td>{new Date(platformUser.createdAt).toLocaleString()}</td>
                      <td>{platformUser.emailVerifiedAt ? "Yes" : "No"}</td>
                      <td>
                        {platformUser.organizations.length === 0
                          ? "—"
                          : platformUser.organizations
                              .map((org) => `${org.name} (${org.role}, ${org.status})`)
                              .join(", ")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
