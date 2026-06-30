import Link from "next/link";
import { redirect } from "next/navigation";

import { getAppRepository } from "@/lib/app-repository";
import { getCurrentUser } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  const repository = getAppRepository();
  const organizations = await repository.listOrganizationSummariesForUser(user);
  const activeOrganization = organizations[0] ?? null;

  return (
    <main className="main">
      <div className="page-header">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>
            {activeOrganization
              ? `${activeOrganization.name} dashboard`
              : "Your SEO operation starts after creating a workspace."}
          </h1>
        </div>
        <Link className="button" href="/">
          Setup workspace
        </Link>
      </div>

      <section className="grid" aria-label="Dashboard metrics">
        <article className="panel">
          <h2>{activeOrganization?.sites.length ?? 0} sites</h2>
          <p>
            Connected-site metrics remain empty until the plugin connection flow is implemented.
          </p>
        </article>
        <article className="panel">
          <h2>0 audits</h2>
          <p>Audit jobs are intentionally not mocked as completed data.</p>
        </article>
        <article className="panel">
          <h2>0 backlog tasks</h2>
          <p>Tasks will be generated from real audit issues in a later iteration.</p>
        </article>
      </section>

      <section className="panel empty-state">
        <h2>Nothing to audit yet</h2>
        <p>
          Connect a WordPress site and Google Search Console property to see traffic loss signals,
          SEO issues, and backlog tasks.
        </p>
      </section>
    </main>
  );
}
