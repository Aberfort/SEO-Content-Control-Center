import type { Site } from "./types";

export type OnboardingChecklistTarget =
  "workspace" | "site" | "plugin" | "content" | "audit" | "backlog";

export type OnboardingChecklistItemStatus = "complete" | "current" | "upcoming";

export type OnboardingChecklistItem = {
  id: string;
  target: OnboardingChecklistTarget;
  title: string;
  detail: string;
  status: OnboardingChecklistItemStatus;
  actionLabel: string;
};

export type OnboardingChecklist = {
  items: OnboardingChecklistItem[];
  completedCount: number;
  totalCount: number;
  progressPercent: number;
  nextItem: OnboardingChecklistItem | null;
};

type OnboardingOrganization = {
  name: string;
  sites: Pick<Site, "id" | "status">[];
};

export type BuildOnboardingChecklistInput = {
  organization: OnboardingOrganization | null;
  activeSite: Pick<Site, "id" | "status"> | null;
  syncedContentTotal: number;
  auditRunCount: number;
  backlogTaskCount: number;
};

const activePluginStatuses = new Set<Site["status"]>(["CONNECTED", "SYNCING"]);

export function buildOnboardingChecklist(
  input: BuildOnboardingChecklistInput
): OnboardingChecklist {
  const organization = input.organization;
  const site = input.activeSite ?? organization?.sites[0] ?? null;
  const hasOrganization = Boolean(organization);
  const hasSite = Boolean(site);
  const hasActivePluginConnection = Boolean(site && activePluginStatuses.has(site.status));
  const hasSyncedContent = input.syncedContentTotal > 0;
  const hasAuditRun = input.auditRunCount > 0;
  const hasBacklogTask = input.backlogTaskCount > 0;

  const items: OnboardingChecklistItem[] = [
    {
      id: "workspace",
      target: "workspace",
      title: "Create workspace",
      detail: hasOrganization
        ? `${organization?.name ?? "Workspace"} is active.`
        : "Create the tenant workspace.",
      status: hasOrganization ? "complete" : "current",
      actionLabel: "Create workspace"
    },
    {
      id: "site",
      target: "site",
      title: "Add WordPress site",
      detail: hasSite ? "A WordPress site is registered." : "Add the first site to this workspace.",
      status: hasSite ? "complete" : hasOrganization ? "current" : "upcoming",
      actionLabel: "Add site"
    },
    {
      id: "plugin",
      target: "plugin",
      title: "Connect plugin",
      detail: hasActivePluginConnection
        ? "Plugin connection is active."
        : "Connect the WordPress plugin for sync.",
      status: hasActivePluginConnection ? "complete" : hasSite ? "current" : "upcoming",
      actionLabel: "Open sites"
    },
    {
      id: "content",
      target: "content",
      title: "Sync content",
      detail: hasSyncedContent
        ? `${input.syncedContentTotal} content items synced.`
        : "Run the first content inventory sync.",
      status: hasSyncedContent ? "complete" : hasActivePluginConnection ? "current" : "upcoming",
      actionLabel: "Review content"
    },
    {
      id: "audit",
      target: "audit",
      title: "Run metadata audit",
      detail: hasAuditRun ? "The first site audit exists." : "Create the first metadata audit.",
      status: hasAuditRun ? "complete" : hasSyncedContent ? "current" : "upcoming",
      actionLabel: "Open audits"
    },
    {
      id: "backlog",
      target: "backlog",
      title: "Create backlog task",
      detail: hasBacklogTask ? "The first backlog task exists." : "Turn an issue into a task.",
      status: hasBacklogTask ? "complete" : hasAuditRun ? "current" : "upcoming",
      actionLabel: "Open backlog"
    }
  ];

  const completedCount = items.filter((item) => item.status === "complete").length;
  const nextItem = items.find((item) => item.status === "current") ?? null;

  return {
    items,
    completedCount,
    totalCount: items.length,
    progressPercent: Math.round((completedCount / items.length) * 100),
    nextItem
  };
}
