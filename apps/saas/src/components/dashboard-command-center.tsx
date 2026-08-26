import { History } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { createAuditForSiteAction } from "@/app/actions";
import { EmptyState } from "@/components/empty-state";
import type {
  ActivityLog,
  Audit,
  BacklogTaskSummary,
  GscConnectionOverview,
  Site
} from "@/lib/types";

type DashboardCommandCenterProps = {
  organizationId: string | null;
  sites: Site[];
  activeSite: Site | null;
  currentHref: string;
  syncedContentTotal: number;
  latestAudit: Audit | null;
  backlogSummary: BacklogTaskSummary;
  gscOverview: GscConnectionOverview | null;
  activity: ActivityLog[];
};

type Signal = {
  label: string;
  value: string;
  tone: "success" | "information" | "attention" | "danger" | "muted";
};

export function DashboardCommandCenter({
  organizationId,
  sites,
  activeSite,
  currentHref,
  syncedContentTotal,
  latestAudit,
  backlogSummary,
  gscOverview,
  activity
}: DashboardCommandCenterProps) {
  const siteQuery = activeSite ? `?site=${encodeURIComponent(activeSite.id)}` : "";
  const signals = buildSignals({
    activeSite,
    syncedContentTotal,
    latestAudit,
    backlogSummary,
    gscOverview
  });

  return (
    <div className="overview-page">
      <header className="overview-header">
        <div>
          <h1>Site overview</h1>
          <p>{activeSite ? activeSite.url : "Choose a WordPress site to begin."}</p>
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
      </header>

      <div className="overview-workspace">
        <section className="priority-queue" aria-labelledby="priority-queue-title">
          <div className="overview-section-heading">
            <div>
              <h2 id="priority-queue-title">Priority queue</h2>
              <p>Work that moves this site forward.</p>
            </div>
          </div>

          <PriorityRow
            tone={activeSite?.status === "CONNECTED" ? "success" : "information"}
            title={activeSite ? "WordPress connection" : "Add a WordPress site"}
            detail={formatConnectionDetail(activeSite)}
            status={activeSite ? formatStatus(activeSite.status) : "Not started"}
            action={
              <Link className="secondary-button" href={`/sites${siteQuery}`}>
                {activeSite ? "Manage site" : "Add site"}
              </Link>
            }
          />

          <PriorityRow
            tone={syncedContentTotal > 0 ? "success" : "information"}
            title="Content evidence"
            detail={
              syncedContentTotal > 0
                ? `${formatCount(syncedContentTotal, "item")} available for review.`
                : "Run the WordPress plugin sync to collect content evidence."
            }
            status={syncedContentTotal > 0 ? "Synced" : "Awaiting sync"}
            action={
              <Link className="secondary-button" href={`/content${siteQuery}`}>
                Review content
              </Link>
            }
          />

          <PriorityRow
            tone={
              latestAudit?.issueSummary.critical
                ? "danger"
                : latestAudit
                  ? "attention"
                  : "information"
            }
            title="Metadata audit"
            detail={formatAuditDetail(latestAudit, syncedContentTotal)}
            status={latestAudit ? formatStatus(latestAudit.status) : "Not run"}
            action={
              organizationId && activeSite && syncedContentTotal > 0 ? (
                <form action={createAuditForSiteAction}>
                  <input name="organizationId" type="hidden" value={organizationId} />
                  <input name="siteId" type="hidden" value={activeSite.id} />
                  <input name="redirectTo" type="hidden" value={currentHref} />
                  <button className="secondary-button" type="submit">
                    Run audit
                  </button>
                </form>
              ) : (
                <Link className="secondary-button" href={`/audits${siteQuery}`}>
                  Open audits
                </Link>
              )
            }
          />

          <PriorityRow
            tone={
              backlogSummary.bySeverity.CRITICAL > 0
                ? "danger"
                : backlogSummary.open > 0
                  ? "attention"
                  : "success"
            }
            title="SEO backlog"
            detail={formatBacklogDetail(backlogSummary)}
            status={`${backlogSummary.open.toLocaleString("en")} open`}
            action={
              <Link className="secondary-button" href={`/backlog${siteQuery}`}>
                Review backlog
              </Link>
            }
          />
        </section>

        <aside className="site-signals" aria-labelledby="site-signals-title">
          <div className="overview-section-heading">
            <div>
              <h2 id="site-signals-title">Site signals</h2>
              <p>Current integration and workflow state.</p>
            </div>
          </div>
          <ul>
            {signals.map((signal) => (
              <li key={signal.label}>
                <span className={`signal-dot signal-dot-${signal.tone}`} aria-hidden="true" />
                <span>{signal.label}</span>
                <strong>{signal.value}</strong>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      <section className="overview-activity" aria-labelledby="overview-activity-title">
        <div className="overview-section-heading">
          <div>
            <h2 id="overview-activity-title">Recent activity</h2>
            <p>Latest workspace changes and completed operations.</p>
          </div>
          <Link className="text-button" href="/settings#activity-title">
            View activity
          </Link>
        </div>
        {activity.length > 0 ? (
          <ul>
            {activity.slice(0, 5).map((item) => (
              <li key={item.id}>
                <span>{formatActivityAction(item.action)}</span>
                <time dateTime={item.createdAt}>{formatDateTime(item.createdAt)}</time>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={History}>
            Nothing to show yet. Once you connect a site, sync content, or run an audit, every
            change lands here.
          </EmptyState>
        )}
      </section>
    </div>
  );
}

function PriorityRow({
  tone,
  title,
  detail,
  status,
  action
}: {
  tone: Signal["tone"];
  title: string;
  detail: string;
  status: string;
  action: ReactNode;
}) {
  return (
    <div className="priority-row">
      <span className={`priority-marker priority-marker-${tone}`} aria-hidden="true" />
      <div className="priority-copy">
        <strong>{title}</strong>
        <span>{detail}</span>
      </div>
      <span className={`queue-status queue-status-${tone}`}>{status}</span>
      <div className="priority-action">{action}</div>
    </div>
  );
}

function buildSignals(input: {
  activeSite: Site | null;
  syncedContentTotal: number;
  latestAudit: Audit | null;
  backlogSummary: BacklogTaskSummary;
  gscOverview: GscConnectionOverview | null;
}): Signal[] {
  return [
    {
      label: "WordPress",
      value: input.activeSite ? formatStatus(input.activeSite.status) : "No site",
      tone: input.activeSite?.status === "CONNECTED" ? "success" : "information"
    },
    {
      label: "Search Console",
      value: input.gscOverview?.connected ? "Connected" : "Not connected",
      tone: input.gscOverview?.connected ? "success" : "muted"
    },
    {
      label: "Synced content",
      value: input.syncedContentTotal.toLocaleString("en"),
      tone: input.syncedContentTotal > 0 ? "success" : "information"
    },
    {
      label: "Critical audit issues",
      value: (input.latestAudit?.issueSummary.critical ?? 0).toLocaleString("en"),
      tone: input.latestAudit?.issueSummary.critical
        ? "danger"
        : input.latestAudit
          ? "success"
          : "muted"
    },
    {
      label: "Open backlog tasks",
      value: input.backlogSummary.open.toLocaleString("en"),
      tone: input.backlogSummary.open > 0 ? "attention" : "success"
    }
  ];
}

function formatConnectionDetail(site: Site | null): string {
  if (!site) {
    return "Register the first site before configuring integrations.";
  }

  if (site.status === "CONNECTED") {
    return "The plugin connection is ready for content sync and safe operations.";
  }

  return "Finish the plugin connection before syncing content.";
}

function formatAuditDetail(audit: Audit | null, syncedContentTotal: number): string {
  if (!audit) {
    return syncedContentTotal > 0
      ? "Synced metadata is ready for the first audit."
      : "Sync content before running the first metadata audit.";
  }

  return `${audit.issueSummary.open.toLocaleString("en")} open issues, ${audit.issueSummary.critical.toLocaleString("en")} critical.`;
}

function formatBacklogDetail(summary: BacklogTaskSummary): string {
  if (summary.open === 0) {
    return "No open SEO work is waiting for review.";
  }

  return `${summary.bySeverity.HIGH.toLocaleString("en")} high and ${summary.bySeverity.CRITICAL.toLocaleString("en")} critical tasks.`;
}

function formatCount(count: number, singular: string): string {
  return `${count.toLocaleString("en")} ${count === 1 ? singular : `${singular}s`}`;
}

function formatStatus(status: string): string {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^./, (character) => character.toUpperCase());
}

function formatActivityAction(action: string): string {
  return action
    .replaceAll("_", " ")
    .replaceAll(".", " · ")
    .replace(/^./, (character) => character.toUpperCase());
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
