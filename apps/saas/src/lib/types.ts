import type { Role } from "@sccc/shared";

export type AppUser = {
  id: string;
  email: string;
  name: string;
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
};

export type OrganizationMember = {
  id: string;
  organizationId: string;
  userId: string;
  role: Role;
  status: "ACTIVE" | "INVITED" | "SUSPENDED" | "CANCELED";
  invitedEmail?: string | null;
  inviteExpiresAt?: string | null;
  inviteAcceptedAt?: string | null;
  inviteCanceledAt?: string | null;
};

export type OrganizationMemberSummary = OrganizationMember & {
  email: string;
  name: string | null;
  invitedEmail: string | null;
  createdAt: string;
};

export type InviteResult = {
  member: OrganizationMemberSummary;
  inviteUrl: string;
  expiresAt: string;
};

export type Site = {
  id: string;
  organizationId: string;
  name: string;
  url: string;
  status: "PENDING_CONNECTION" | "CONNECTED" | "SYNCING" | "ERROR" | "DISCONNECTED";
  createdAt: string;
};

export type ActivityLog = {
  id: string;
  organizationId: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, string | number | boolean | null>;
  createdAt: string;
};

export type SyncedContentItem = {
  id: string;
  organizationId: string;
  siteId: string;
  externalId: string;
  type: string;
  url: string;
  title: string | null;
  status: string;
  modifiedAt: string;
  firstSeenAt: string;
  lastSeenAt: string;
};

export type SyncedContentHealthSignal = {
  id: string;
  label: string;
  severity: "success" | "info" | "warning" | "critical";
  message: string;
};

export type SyncedContentBacklogCandidate = {
  id: string;
  title: string;
  priority: "low" | "medium" | "high";
  sourceSignalId: string;
  rationale: string;
  nextStep: string;
};

export type SyncedContentListOptions = {
  query?: string;
  type?: string;
  status?: string;
  cursor?: string;
  limit?: number;
};

export type SyncedContentList = {
  items: SyncedContentItem[];
  nextCursor: string | null;
  total: number;
};

export type SyncedContentDetail = SyncedContentItem & {
  healthSignals: SyncedContentHealthSignal[];
  backlogCandidates: SyncedContentBacklogCandidate[];
};

export type BacklogTask = {
  id: string;
  organizationId: string;
  siteId: string;
  auditIssueId: string | null;
  title: string;
  url: string;
  issueType: string;
  status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "SNOOZED" | "IGNORED";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  potentialImpact: string | null;
  effortEstimate: number | null;
  assigneeId: string | null;
  dueDate: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  comments: BacklogTaskComment[];
};

export type BacklogTaskComment = {
  id: string;
  taskId: string;
  authorId: string;
  authorEmail: string;
  authorName: string | null;
  body: string;
  createdAt: string;
};

export type BacklogTaskListOptions = {
  status?: BacklogTask["status"];
  severity?: BacklogTask["severity"];
  limit?: number;
};

export type BacklogTaskSummary = {
  total: number;
  open: number;
  done: number;
  byStatus: Record<BacklogTask["status"], number>;
  bySeverity: Record<BacklogTask["severity"], number>;
};

export type BacklogTaskList = {
  items: BacklogTask[];
  summary: BacklogTaskSummary;
};

export type OrganizationSummary = Organization & {
  role: Role;
  sites: Site[];
  activityLogs: ActivityLog[];
};
