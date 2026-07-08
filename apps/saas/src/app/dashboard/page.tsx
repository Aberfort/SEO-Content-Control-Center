import Link from "next/link";
import { redirect } from "next/navigation";

import { OnboardingChecklist } from "@/components/onboarding-checklist";
import { getAppRepository } from "@/lib/app-repository";
import { getCurrentUser } from "@/lib/auth";
import { buildOnboardingChecklist } from "@/lib/onboarding-checklist";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  const repository = getAppRepository();
  const organizations = await repository.listOrganizationSummariesForUser(user);
  const activeOrganization = organizations[0] ?? null;
  const activeSite = activeOrganization?.sites[0] ?? null;
  const syncedContent =
    activeOrganization && activeSite
      ? await repository.listSyncedContentForSite(user.id, activeOrganization.id, activeSite.id, {
          limit: 1
        })
      : {
          total: 0
        };
  const auditRuns =
    activeOrganization && activeSite
      ? await repository.listAuditsForSite(user.id, activeOrganization.id, activeSite.id, {
          limit: 5
        })
      : [];
  const backlogTasks =
    activeOrganization && activeSite
      ? await repository.listBacklogTasksForSite(user.id, activeOrganization.id, activeSite.id, {
          limit: 1
        })
      : {
          summary: {
            total: 0
          }
        };
  const onboardingChecklist = buildOnboardingChecklist({
    organization: activeOrganization,
    activeSite,
    syncedContentTotal: syncedContent.total,
    auditRunCount: auditRuns.length,
    backlogTaskCount: backlogTasks.summary.total
  });
  const selectedSiteQuery = activeSite ? `?site=${encodeURIComponent(activeSite.id)}` : "";

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
          <p>Sites are scoped to the active workspace.</p>
        </article>
        <article className="panel">
          <h2>{auditRuns.length} recent audits</h2>
          <p>Recent metadata audit runs for the first site.</p>
        </article>
        <article className="panel">
          <h2>{backlogTasks.summary.total} backlog tasks</h2>
          <p>Backlog tasks can be created from synced content candidates or audit issues.</p>
        </article>
      </section>

      <OnboardingChecklist
        checklist={onboardingChecklist}
        hrefs={{
          workspace: "/#workspace-setup",
          site: "/#workspace-setup",
          plugin: "/#sites-title",
          content: `/${selectedSiteQuery}#synced-content-title`,
          audit: `/${selectedSiteQuery}#audits-title`,
          backlog: `/${selectedSiteQuery}#backlog-title`
        }}
      />

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
