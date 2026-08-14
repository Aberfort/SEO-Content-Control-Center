import Link from "next/link";

import { createAuditForSiteAction } from "@/app/actions";
import { PluginChallengeForm } from "@/components/plugin-challenge-form";
import type {
  Audit,
  BacklogTaskSummary,
  BillingOverview,
  GscConnectionOverview,
  Site
} from "@/lib/types";

type DashboardCommandCenterProps = {
  organizationId: string | null;
  organizationName: string | null;
  sites: Site[];
  activeSite: Site | null;
  canManageIntegrations: boolean;
  currentHref: string;
  syncedContentTotal: number;
  latestAudit: Audit | null;
  backlogSummary: BacklogTaskSummary;
  gscOverview: GscConnectionOverview | null;
  billingOverview: BillingOverview | null;
};

type HealthTile = {
  label: string;
  value: string;
  detail: string;
  tone: "success" | "attention" | "danger" | "muted";
  href: string;
};

export function DashboardCommandCenter({
  organizationId,
  organizationName,
  sites,
  activeSite,
  canManageIntegrations,
  currentHref,
  syncedContentTotal,
  latestAudit,
  backlogSummary,
  gscOverview,
  billingOverview
}: DashboardCommandCenterProps) {
  const tiles = buildHealthTiles({
    activeSite,
    syncedContentTotal,
    latestAudit,
    backlogSummary,
    gscOverview
  });

  return (
    <section className="command-center" aria-labelledby="command-center-title">
      <div className="command-header">
        <div>
          <p className="eyebrow">Site Command Center</p>
          <h1 id="command-center-title">
            {activeSite ? activeSite.name : "Connect a WordPress site to start SEO operations."}
          </h1>
          <p>
            {activeSite
              ? activeSite.url
              : "Create a workspace, add a site, connect the plugin, then sync content evidence."}
          </p>
        </div>
        <form className="site-switcher" action="/" method="get">
          <label>
            <span>Active site</span>
            <select name="site" defaultValue={activeSite?.id ?? ""} disabled={sites.length === 0}>
              {sites.length > 0 ? (
                sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))
              ) : (
                <option value="">No sites</option>
              )}
            </select>
          </label>
          <button className="secondary-button" type="submit" disabled={sites.length === 0}>
            Switch
          </button>
        </form>
      </div>

      <div className="command-grid">
        <div className="next-action-panel">
          <span className="panel-label">Next action</span>
          <NextAction
            organizationId={organizationId}
            organizationName={organizationName}
            activeSite={activeSite}
            canManageIntegrations={canManageIntegrations}
            currentHref={currentHref}
            syncedContentTotal={syncedContentTotal}
            latestAudit={latestAudit}
            backlogSummary={backlogSummary}
          />
        </div>

        <div className="health-grid" aria-label="Site operating state">
          {tiles.map((tile) => (
            <Link
              className={`health-tile health-tile-${tile.tone}`}
              href={tile.href}
              key={tile.label}
              aria-label={`${tile.label}: ${tile.value}. ${tile.detail}`}
            >
              <span>{tile.label}</span>
              <strong>{tile.value}</strong>
              <small>{tile.detail}</small>
            </Link>
          ))}
        </div>
      </div>

      <div className="command-footer">
        <span>{organizationName ?? "No workspace"}</span>
        <span>{billingOverview?.currentPlan.name ?? "No plan"}</span>
        <span>{activeSite ? activeSite.status.replaceAll("_", " ").toLowerCase() : "no site"}</span>
      </div>
    </section>
  );
}

function NextAction({
  organizationId,
  organizationName,
  activeSite,
  canManageIntegrations,
  currentHref,
  syncedContentTotal,
  latestAudit,
  backlogSummary
}: {
  organizationId: string | null;
  organizationName: string | null;
  activeSite: Site | null;
  canManageIntegrations: boolean;
  currentHref: string;
  syncedContentTotal: number;
  latestAudit: Audit | null;
  backlogSummary: BacklogTaskSummary;
}) {
  if (!organizationId) {
    return (
      <>
        <h2>Create the workspace</h2>
        <p>Start with an organization. Site connection and sync controls appear after that.</p>
        <a className="button" href="#workspace-setup">
          Create organization
        </a>
      </>
    );
  }

  if (!activeSite) {
    return (
      <>
        <h2>Add the first WordPress site</h2>
        <p>{organizationName} is ready. Register the WordPress URL before plugin setup.</p>
        <a className="button" href="#workspace-setup">
          Add site
        </a>
      </>
    );
  }

  if (activeSite.status === "PENDING_CONNECTION" || activeSite.status === "DISCONNECTED") {
    return (
      <>
        <h2>Connect the WordPress plugin</h2>
        <p>Generate a short-lived challenge, paste it into WordPress, then run the first sync.</p>
        {canManageIntegrations ? (
          <PluginChallengeForm organizationId={organizationId} siteId={activeSite.id} />
        ) : (
          <span className="muted-text">Your role cannot manage plugin connections.</span>
        )}
      </>
    );
  }

  if (syncedContentTotal === 0) {
    return (
      <>
        <h2>Run the first content sync</h2>
        <p>Open the WordPress plugin screen and queue a manual sync from the connected site.</p>
        <a
          className="button"
          href={`${activeSite.url.replace(/\/$/, "")}/wp-admin/options-general.php?page=sccc`}
        >
          Open WordPress plugin
        </a>
      </>
    );
  }

  if (!latestAudit) {
    return (
      <>
        <h2>Run the first metadata audit</h2>
        <p>
          {syncedContentTotal.toLocaleString("en")} content items are synced and ready for review.
        </p>
        <form action={createAuditForSiteAction}>
          <input name="organizationId" type="hidden" value={organizationId} />
          <input name="siteId" type="hidden" value={activeSite.id} />
          <input name="redirectTo" type="hidden" value={currentHref} />
          <button className="button" type="submit">
            Run metadata audit
          </button>
        </form>
      </>
    );
  }

  if (backlogSummary.open > 0) {
    return (
      <>
        <h2>Review open backlog work</h2>
        <p>
          {backlogSummary.open.toLocaleString("en")} open tasks are ready for triage, assignment, or
          safe preview.
        </p>
        <a className="button" href="#backlog-title">
          Review backlog
        </a>
      </>
    );
  }

  return (
    <>
      <h2>Inspect fresh site evidence</h2>
      <p>
        Content and audit evidence are available. Review synced pages or create tasks from findings.
      </p>
      <a className="button" href="#synced-content-title">
        Review content
      </a>
    </>
  );
}

function buildHealthTiles(input: {
  activeSite: Site | null;
  syncedContentTotal: number;
  latestAudit: Audit | null;
  backlogSummary: BacklogTaskSummary;
  gscOverview: GscConnectionOverview | null;
}): HealthTile[] {
  const siteStatus = input.activeSite?.status ?? null;

  return [
    {
      label: "WordPress sync",
      value:
        input.syncedContentTotal > 0 ? formatItemCount(input.syncedContentTotal) : "Awaiting sync",
      detail: siteStatus ? siteStatus.replaceAll("_", " ").toLowerCase() : "Add a site first",
      tone: input.syncedContentTotal > 0 ? "success" : "attention",
      href: "#synced-content-title"
    },
    {
      label: "Search Console",
      value: input.gscOverview?.connected ? "Connected" : "Not connected",
      detail: input.gscOverview?.connected
        ? formatPropertyConnectionCount(input.gscOverview.connections.length)
        : "Optional traffic evidence",
      tone: input.gscOverview?.connected ? "success" : "muted",
      href: "#gsc-title"
    },
    {
      label: "Audit health",
      value: input.latestAudit ? input.latestAudit.status.toLowerCase() : "No audit",
      detail: input.latestAudit
        ? `${input.latestAudit.issueSummary.open} open / ${input.latestAudit.issueSummary.critical} critical`
        : "Run from synced metadata",
      tone: input.latestAudit?.issueSummary.critical
        ? "danger"
        : input.latestAudit
          ? "success"
          : "muted",
      href: "#audits-title"
    },
    {
      label: "Backlog",
      value: `${input.backlogSummary.open.toLocaleString("en")} open`,
      detail: `${input.backlogSummary.bySeverity.HIGH} high / ${input.backlogSummary.bySeverity.CRITICAL} critical`,
      tone:
        input.backlogSummary.bySeverity.CRITICAL > 0
          ? "danger"
          : input.backlogSummary.open > 0
            ? "attention"
            : "muted",
      href: "#backlog-title"
    }
  ];
}

function formatItemCount(count: number) {
  return `${count.toLocaleString("en")} ${count === 1 ? "item" : "items"}`;
}

function formatPropertyConnectionCount(count: number) {
  return `${count.toLocaleString("en")} property ${count === 1 ? "connection" : "connections"}`;
}
