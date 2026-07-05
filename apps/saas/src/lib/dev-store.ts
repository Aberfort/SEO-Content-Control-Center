import { randomUUID } from "node:crypto";

import {
  acceptInviteSchema,
  assertPermission,
  auditIssueListQuerySchema,
  auditListQuerySchema,
  assistantRecommendationListQuerySchema,
  backlogTaskCommentCreateSchema,
  backlogTaskFromAuditIssueSchema,
  bulkOperationConfirmSchema,
  bulkOperationDryRunSchema,
  bulkOperationListQuerySchema,
  bulkOperationPreviewCreateSchema,
  bulkOperationResultSchema,
  bulkOperationRetrySchema,
  bulkOperationRollbackSchema,
  bulkOperationStartSchema,
  hasPermission,
  inviteMemberSchema,
  notificationListQuerySchema,
  notificationReadUpdateSchema,
  organizationCreateSchema,
  siteCreateSchema,
  updateAuditIssueStatusSchema,
  updateBacklogTaskAssignmentSchema,
  updateMemberRoleSchema,
  type AcceptInviteInput,
  type AssistantRecommendationListQuery,
  type AuditIssueListQuery,
  type AuditListQuery,
  type BacklogTaskCommentCreateInput,
  type BacklogTaskFromAuditIssueInput,
  type BulkOperationConfirmInput,
  type BulkOperationDryRunInput,
  type BulkOperationListQuery,
  type BulkOperationPreviewCreateInput,
  type BulkOperationResultInput,
  type BulkOperationRetryInput,
  type BulkOperationRollbackInput,
  type BulkOperationStartInput,
  type InviteMemberInput,
  type NotificationListQuery,
  type NotificationReadUpdateInput,
  type Permission,
  type Role,
  type SiteCreateInput,
  type UpdateAuditIssueStatusInput,
  type UpdateBacklogTaskAssignmentInput,
  type UpdateMemberRoleInput
} from "@sccc/shared";

import { buildInviteUrl, createInviteToken, hashInviteToken } from "./invite-token";
import type {
  ActivityLog,
  AppUser,
  AssistantRecommendationList,
  AssistantRecommendationListOptions,
  Audit,
  AuditIssue,
  AuditIssueListOptions,
  AuditListOptions,
  BacklogTask,
  BacklogTaskComment,
  BacklogTaskList,
  BacklogTaskListOptions,
  BacklogTaskSummary,
  BillingOverview,
  BulkOperation,
  BulkOperationItem,
  BulkOperationListOptions,
  InviteResult,
  NotificationBulkUpdateResult,
  Notification,
  NotificationListOptions,
  Organization,
  OrganizationMember,
  OrganizationMemberSummary,
  OrganizationSummary,
  Site,
  SyncedContentItem,
  SyncedContentList,
  SyncedContentListOptions
} from "./types";
import {
  buildAssistantRecommendationFromBacklogTask,
  sortAssistantRecommendations
} from "./assistant-recommendations";
import { buildAssistantUsage } from "./assistant-usage";
import { buildFallbackBillingPlans, findBillingPlan } from "./billing-plans";
import { buildBulkOperationNotification } from "./bulk-operation-notifications";

type DevStoreState = {
  users: AppUser[];
  organizations: Organization[];
  members: StoreOrganizationMember[];
  sites: Site[];
  audits: Audit[];
  backlogTasks: BacklogTask[];
  backlogComments: BacklogTaskComment[];
  bulkOperations: BulkOperation[];
  bulkOperationItems: BulkOperationItem[];
  activityLogs: ActivityLog[];
  notifications: Notification[];
};

type StoreOrganizationMember = OrganizationMember & {
  inviteTokenHash?: string | null;
};

type CreateOrganizationInput = {
  user: AppUser;
  name: string;
};

type CreateSiteInput = {
  user: AppUser;
  organizationId: string;
  name: string;
  url: string;
};

type InviteMemberInputWithUser = {
  user: AppUser;
  organizationId: string;
  email: string;
  role: Role;
};

type UpdateMemberRoleInputWithUser = {
  user: AppUser;
  organizationId: string;
  memberId: string;
  role: Role;
};

type MemberMutationInputWithUser = {
  user: AppUser;
  organizationId: string;
  memberId: string;
};

type AcceptInviteInputWithUser = {
  user: AppUser;
  token: AcceptInviteInput["token"];
};

type AccessInput = {
  userId: string;
  organizationId: string;
  permission: Permission;
};

const globalStore = globalThis as typeof globalThis & {
  __scccDevStore?: DevStoreState;
};

function nowIso(): string {
  return new Date().toISOString();
}

function slugify(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || `organization-${randomUUID().slice(0, 8)}`;
}

function normalizeUrl(url: string): string {
  const parsed = new URL(url);
  parsed.hash = "";
  parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  return parsed.toString();
}

function initialState(): DevStoreState {
  return {
    users: [],
    organizations: [],
    members: [],
    sites: [],
    audits: [],
    backlogTasks: [],
    backlogComments: [],
    bulkOperations: [],
    bulkOperationItems: [],
    activityLogs: [],
    notifications: []
  };
}

export function getDevStore(): DevStoreState {
  globalStore.__scccDevStore ??= initialState();
  return globalStore.__scccDevStore;
}

export function resetDevStore(): void {
  globalStore.__scccDevStore = initialState();
}

export function ensureUser(user: AppUser): AppUser {
  const store = getDevStore();
  const existing = store.users.find((candidate) => candidate.id === user.id);

  if (existing) {
    return existing;
  }

  store.users.push(user);
  return user;
}

function ensurePlaceholderUser(email: string): AppUser {
  const store = getDevStore();
  const existing = store.users.find((candidate) => candidate.email === email);

  if (existing) {
    return existing;
  }

  const user: AppUser = {
    id: randomUUID(),
    email,
    name: email
  };

  store.users.push(user);
  return user;
}

export function listOrganizationSummariesForUser(user: AppUser): OrganizationSummary[] {
  ensureUser(user);
  const store = getDevStore();

  return store.members
    .filter((member) => member.userId === user.id && member.status === "ACTIVE")
    .map((member) => {
      const organization = store.organizations.find(
        (candidate) => candidate.id === member.organizationId
      );

      if (!organization) {
        return null;
      }

      return {
        ...organization,
        role: member.role,
        sites: listSitesForOrganization(user.id, organization.id),
        activityLogs: listActivityLogsForOrganization(user.id, organization.id)
      };
    })
    .filter((summary): summary is OrganizationSummary => summary !== null);
}

export function createOrganization(input: CreateOrganizationInput): OrganizationSummary {
  const parsed = organizationCreateSchema.parse({ name: input.name });
  const store = getDevStore();
  ensureUser(input.user);

  const baseSlug = slugify(parsed.name);
  const existingSlugs = new Set(store.organizations.map((organization) => organization.slug));
  let slug = baseSlug;
  let suffix = 2;

  while (existingSlugs.has(slug)) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  const organization: Organization = {
    id: randomUUID(),
    name: parsed.name,
    slug,
    createdAt: nowIso()
  };

  const member: StoreOrganizationMember = {
    id: randomUUID(),
    organizationId: organization.id,
    userId: input.user.id,
    role: "OWNER",
    status: "ACTIVE"
  };

  store.organizations.push(organization);
  store.members.push(member);
  writeActivityLog({
    organizationId: organization.id,
    userId: input.user.id,
    action: "organization.created",
    entityType: "Organization",
    entityId: organization.id,
    metadata: {
      name: organization.name,
      slug: organization.slug
    }
  });

  return {
    ...organization,
    role: member.role,
    sites: [],
    activityLogs: listActivityLogsForOrganization(input.user.id, organization.id)
  };
}

export function getMembership(userId: string, organizationId: string): OrganizationMember | null {
  const store = getDevStore();

  return (
    store.members.find(
      (member) =>
        member.userId === userId &&
        member.organizationId === organizationId &&
        member.status === "ACTIVE"
    ) ?? null
  );
}

export function requireOrganizationAccess(input: AccessInput): OrganizationMember {
  const member = getMembership(input.userId, input.organizationId);

  if (!member) {
    throw new Error("ORGANIZATION_NOT_FOUND");
  }

  assertPermission(member.role, input.permission);
  return member;
}

export function canAccessOrganization(
  userId: string,
  organizationId: string,
  permission: Permission
): boolean {
  const member = getMembership(userId, organizationId);
  return member ? hasPermission(member.role, permission) : false;
}

export function getOrganizationSummary(
  userId: string,
  organizationId: string
): OrganizationSummary | null {
  const member = requireOrganizationAccess({
    userId,
    organizationId,
    permission: "organization:read"
  });
  const store = getDevStore();
  const organization = store.organizations.find((candidate) => candidate.id === organizationId);

  if (!organization) {
    return null;
  }

  return {
    ...organization,
    role: member.role,
    sites: listSitesForOrganization(userId, organizationId),
    activityLogs: listActivityLogsForOrganization(userId, organizationId)
  };
}

export function createSite(input: CreateSiteInput): Site {
  const parsed: SiteCreateInput = siteCreateSchema.parse(input);
  const store = getDevStore();

  requireOrganizationAccess({
    userId: input.user.id,
    organizationId: parsed.organizationId,
    permission: "site:create"
  });

  const normalizedUrl = normalizeUrl(parsed.url);
  const duplicate = store.sites.find(
    (site) => site.organizationId === parsed.organizationId && site.url === normalizedUrl
  );

  if (duplicate) {
    throw new Error("SITE_ALREADY_EXISTS");
  }

  const site: Site = {
    id: randomUUID(),
    organizationId: parsed.organizationId,
    name: parsed.name,
    url: normalizedUrl,
    status: "PENDING_CONNECTION",
    createdAt: nowIso()
  };

  store.sites.push(site);
  writeActivityLog({
    organizationId: site.organizationId,
    userId: input.user.id,
    action: "site.created",
    entityType: "Site",
    entityId: site.id,
    metadata: {
      name: site.name,
      url: site.url
    }
  });

  return site;
}

export function listSitesForOrganization(userId: string, organizationId: string): Site[] {
  requireOrganizationAccess({
    userId,
    organizationId,
    permission: "site:read"
  });

  return getDevStore().sites.filter((site) => site.organizationId === organizationId);
}

export function listActivityLogsForOrganization(
  userId: string,
  organizationId: string
): ActivityLog[] {
  requireOrganizationAccess({
    userId,
    organizationId,
    permission: "organization:read"
  });

  return getDevStore()
    .activityLogs.filter((log) => log.organizationId === organizationId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function getBillingOverviewForOrganization(
  userId: string,
  organizationId: string
): BillingOverview {
  requireOrganizationAccess({
    userId,
    organizationId,
    permission: "billing:read"
  });

  const plans = buildFallbackBillingPlans();

  return {
    plans,
    currentPlan: findBillingPlan(plans, "TRIAL"),
    subscription: null,
    isFallbackTrial: true
  };
}

export function listNotificationsForOrganization(
  userId: string,
  organizationId: string,
  options?: NotificationListOptions
): Notification[] {
  const parsed: NotificationListQuery = notificationListQuerySchema.parse(options ?? {});
  requireOrganizationAccess({
    userId,
    organizationId,
    permission: "organization:read"
  });

  return getDevStore()
    .notifications.filter((notification) => {
      const scopeMatches = notification.organizationId === organizationId;
      const readMatches =
        parsed.read === "read"
          ? notification.readAt !== null
          : parsed.read === "unread"
            ? notification.readAt === null
            : true;

      return scopeMatches && readMatches;
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, parsed.limit ?? 25);
}

export function markAllNotificationsRead(
  user: AppUser,
  organizationId: string
): NotificationBulkUpdateResult {
  requireOrganizationAccess({
    userId: user.id,
    organizationId,
    permission: "organization:read"
  });

  let updatedCount = 0;
  const timestamp = nowIso();

  for (const notification of getDevStore().notifications) {
    if (notification.organizationId === organizationId && !notification.readAt) {
      notification.readAt = timestamp;
      updatedCount += 1;
    }
  }

  return {
    updatedCount
  };
}

export function updateNotificationReadState(
  input: NotificationReadUpdateInput & {
    user: AppUser;
  }
): Notification {
  const parsed = notificationReadUpdateSchema.parse(input);
  requireOrganizationAccess({
    userId: input.user.id,
    organizationId: parsed.organizationId,
    permission: "organization:read"
  });

  const notification = getDevStore().notifications.find(
    (candidate) =>
      candidate.id === parsed.notificationId && candidate.organizationId === parsed.organizationId
  );

  if (!notification) {
    throw new Error("NOTIFICATION_NOT_FOUND");
  }

  if (parsed.read && !notification.readAt) {
    notification.readAt = nowIso();
  }

  if (!parsed.read) {
    notification.readAt = null;
  }

  return notification;
}

export function listSyncedContentForSite(
  userId: string,
  organizationId: string,
  siteId: string,
  options?: SyncedContentListOptions
): SyncedContentList {
  void siteId;
  void options;

  requireOrganizationAccess({
    userId,
    organizationId,
    permission: "site:read"
  });

  return {
    items: [],
    nextCursor: null,
    total: 0
  };
}

export function getSyncedContentItem(
  userId: string,
  organizationId: string,
  siteId: string,
  contentItemId: string
): SyncedContentItem | null {
  void siteId;
  void contentItemId;

  requireOrganizationAccess({
    userId,
    organizationId,
    permission: "site:read"
  });

  return null;
}

export function listAssistantRecommendationsForSite(
  userId: string,
  organizationId: string,
  siteId: string,
  options?: AssistantRecommendationListOptions
): AssistantRecommendationList {
  const parsed: AssistantRecommendationListQuery = assistantRecommendationListQuerySchema.parse(
    options ?? {}
  );
  requireOrganizationAccess({
    userId,
    organizationId,
    permission: "backlog:read"
  });

  const store = getDevStore();
  const recommendations = store.backlogTasks
    .filter(
      (task) =>
        task.organizationId === organizationId &&
        task.siteId === siteId &&
        ["TODO", "IN_PROGRESS", "IN_REVIEW"].includes(task.status)
    )
    .map(buildAssistantRecommendationFromBacklogTask);

  return {
    recommendations: sortAssistantRecommendations(recommendations).slice(0, parsed.limit ?? 5),
    usage: buildAssistantUsage()
  };
}

export function listAuditsForSite(
  userId: string,
  organizationId: string,
  siteId: string,
  options?: AuditListOptions
): Audit[] {
  const parsed: AuditListQuery = auditListQuerySchema.parse(options ?? {});

  requireOrganizationAccess({
    userId,
    organizationId,
    permission: "audit:read"
  });

  return getDevStore()
    .audits.filter((audit) => {
      const scopeMatches = audit.organizationId === organizationId && audit.siteId === siteId;
      const statusMatches = parsed.status ? audit.status === parsed.status : true;
      return scopeMatches && statusMatches;
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, parsed.limit ?? 25);
}

export function createAuditForSite(input: {
  user: AppUser;
  organizationId: string;
  siteId: string;
}): Audit {
  const store = getDevStore();

  requireOrganizationAccess({
    userId: input.user.id,
    organizationId: input.organizationId,
    permission: "audit:run"
  });

  const site = store.sites.find(
    (candidate) =>
      candidate.id === input.siteId && candidate.organizationId === input.organizationId
  );

  if (!site) {
    throw new Error("SITE_NOT_FOUND");
  }

  const audit: Audit = {
    id: randomUUID(),
    organizationId: input.organizationId,
    siteId: input.siteId,
    status: "QUEUED",
    startedAt: null,
    completedAt: null,
    createdAt: nowIso()
  };

  store.audits.push(audit);
  writeActivityLog({
    organizationId: input.organizationId,
    userId: input.user.id,
    action: "audit.queued",
    entityType: "Audit",
    entityId: audit.id,
    metadata: {
      siteId: input.siteId
    }
  });

  return audit;
}

export function listAuditIssuesForAudit(
  userId: string,
  organizationId: string,
  siteId: string,
  auditId: string,
  options?: AuditIssueListOptions
): AuditIssue[] {
  const parsed: AuditIssueListQuery = auditIssueListQuerySchema.parse(options ?? {});
  void parsed;
  void siteId;
  void auditId;

  requireOrganizationAccess({
    userId,
    organizationId,
    permission: "audit:read"
  });

  throw new Error("AUDIT_NOT_FOUND");
}

export function updateAuditIssueStatus(
  input: UpdateAuditIssueStatusInput & {
    user: AppUser;
  }
): AuditIssue {
  const parsed = updateAuditIssueStatusSchema.parse(input);

  requireOrganizationAccess({
    userId: input.user.id,
    organizationId: parsed.organizationId,
    permission: "audit:run"
  });

  throw new Error("AUDIT_ISSUE_NOT_FOUND");
}

export function createBacklogTaskFromCandidate(input: {
  user: AppUser;
  organizationId: string;
  siteId: string;
  contentItemId: string;
  candidateId: string;
}): BacklogTask {
  void input.siteId;
  void input.contentItemId;
  void input.candidateId;

  requireOrganizationAccess({
    userId: input.user.id,
    organizationId: input.organizationId,
    permission: "backlog:update"
  });

  throw new Error("CONTENT_ITEM_NOT_FOUND");
}

export function createBacklogTaskFromAuditIssue(
  input: BacklogTaskFromAuditIssueInput & {
    user: AppUser;
  }
): BacklogTask {
  const parsed = backlogTaskFromAuditIssueSchema.parse(input);

  requireOrganizationAccess({
    userId: input.user.id,
    organizationId: parsed.organizationId,
    permission: "backlog:update"
  });

  throw new Error("AUDIT_ISSUE_NOT_FOUND");
}

export function listBacklogTasksForSite(
  userId: string,
  organizationId: string,
  siteId: string,
  options: BacklogTaskListOptions = {}
): BacklogTaskList {
  requireOrganizationAccess({
    userId,
    organizationId,
    permission: "backlog:read"
  });

  const store = getDevStore();
  const scopedTasks = store.backlogTasks
    .filter((task) => task.organizationId === organizationId && task.siteId === siteId)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

  return {
    items: scopedTasks
      .filter((task) => {
        const queryMatches = options.query ? backlogTaskMatchesQuery(task, options.query) : true;
        const statusMatches = options.status ? task.status === options.status : true;
        const severityMatches = options.severity ? task.severity === options.severity : true;
        return queryMatches && statusMatches && severityMatches;
      })
      .slice(0, options.limit ?? 50)
      .map((task) => withBacklogDetails(task, store.backlogComments, store.activityLogs, 3)),
    summary: summarizeBacklogTasks(scopedTasks)
  };
}

function backlogTaskMatchesQuery(task: BacklogTask, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return [task.title, task.url, task.issueType].some((value) =>
    value.toLowerCase().includes(normalizedQuery)
  );
}

export function updateBacklogTaskStatus(input: {
  user: AppUser;
  organizationId: string;
  siteId: string;
  taskId: string;
  status: BacklogTask["status"];
}): BacklogTask {
  requireOrganizationAccess({
    userId: input.user.id,
    organizationId: input.organizationId,
    permission: "backlog:update"
  });

  const task = getDevStore().backlogTasks.find(
    (candidate) =>
      candidate.id === input.taskId &&
      candidate.organizationId === input.organizationId &&
      candidate.siteId === input.siteId
  );

  if (!task) {
    throw new Error("BACKLOG_TASK_NOT_FOUND");
  }

  const previousStatus = task.status;
  task.status = input.status;
  task.updatedAt = nowIso();

  if (previousStatus !== input.status) {
    writeActivityLog({
      organizationId: input.organizationId,
      userId: input.user.id,
      action: "backlog_task.status_updated",
      entityType: "BacklogTask",
      entityId: task.id,
      metadata: {
        siteId: input.siteId,
        previousStatus,
        status: input.status
      }
    });
  }

  return task;
}

export function updateBacklogTaskAssignment(
  input: UpdateBacklogTaskAssignmentInput & {
    user: AppUser;
  }
): BacklogTask {
  const parsed = updateBacklogTaskAssignmentSchema.parse(input);
  const store = getDevStore();

  requireOrganizationAccess({
    userId: input.user.id,
    organizationId: parsed.organizationId,
    permission: "backlog:update"
  });

  const task = store.backlogTasks.find(
    (candidate) =>
      candidate.id === parsed.taskId &&
      candidate.organizationId === parsed.organizationId &&
      candidate.siteId === parsed.siteId
  );

  if (!task) {
    throw new Error("BACKLOG_TASK_NOT_FOUND");
  }

  if (parsed.assigneeId) {
    const assignee = store.members.find(
      (member) =>
        member.organizationId === parsed.organizationId &&
        member.userId === parsed.assigneeId &&
        member.status === "ACTIVE"
    );

    if (!assignee) {
      throw new Error("BACKLOG_ASSIGNEE_NOT_FOUND");
    }
  }

  const nextAssigneeId = parsed.assigneeId === undefined ? task.assigneeId : parsed.assigneeId;
  const nextDueDate =
    parsed.dueDate === undefined
      ? task.dueDate
      : parsed.dueDate
        ? new Date(`${parsed.dueDate}T00:00:00.000Z`).toISOString()
        : null;

  if (nextAssigneeId === task.assigneeId && nextDueDate === task.dueDate) {
    return task;
  }

  const previousAssigneeId = task.assigneeId;
  const previousDueDate = task.dueDate;
  task.assigneeId = nextAssigneeId;
  task.dueDate = nextDueDate;
  task.updatedAt = nowIso();

  writeActivityLog({
    organizationId: parsed.organizationId,
    userId: input.user.id,
    action: "backlog_task.assignment_updated",
    entityType: "BacklogTask",
    entityId: task.id,
    metadata: {
      siteId: parsed.siteId,
      previousAssigneeId,
      assigneeId: task.assigneeId,
      previousDueDate,
      dueDate: task.dueDate
    }
  });

  return task;
}

export function listBacklogTaskComments(
  userId: string,
  organizationId: string,
  siteId: string,
  taskId: string
): BacklogTaskComment[] {
  const store = getDevStore();
  requireOrganizationAccess({
    userId,
    organizationId,
    permission: "backlog:read"
  });

  const task = store.backlogTasks.find(
    (candidate) =>
      candidate.id === taskId &&
      candidate.organizationId === organizationId &&
      candidate.siteId === siteId
  );

  if (!task) {
    throw new Error("BACKLOG_TASK_NOT_FOUND");
  }

  return getBacklogCommentsForTask(taskId, store.backlogComments, 50);
}

export function listBacklogTaskActivity(
  userId: string,
  organizationId: string,
  siteId: string,
  taskId: string
): ActivityLog[] {
  const store = getDevStore();
  requireOrganizationAccess({
    userId,
    organizationId,
    permission: "backlog:read"
  });

  const task = store.backlogTasks.find(
    (candidate) =>
      candidate.id === taskId &&
      candidate.organizationId === organizationId &&
      candidate.siteId === siteId
  );

  if (!task) {
    throw new Error("BACKLOG_TASK_NOT_FOUND");
  }

  return getBacklogActivityForTask(taskId, siteId, store.activityLogs, 25);
}

export function createBacklogTaskComment(
  input: BacklogTaskCommentCreateInput & {
    user: AppUser;
  }
): BacklogTaskComment {
  const parsed = backlogTaskCommentCreateSchema.parse(input);
  const store = getDevStore();

  requireOrganizationAccess({
    userId: input.user.id,
    organizationId: parsed.organizationId,
    permission: "backlog:update"
  });

  const task = store.backlogTasks.find(
    (candidate) =>
      candidate.id === parsed.taskId &&
      candidate.organizationId === parsed.organizationId &&
      candidate.siteId === parsed.siteId
  );

  if (!task) {
    throw new Error("BACKLOG_TASK_NOT_FOUND");
  }

  const comment: BacklogTaskComment = {
    id: randomUUID(),
    taskId: task.id,
    authorId: input.user.id,
    authorEmail: input.user.email,
    authorName: input.user.name,
    body: parsed.body,
    createdAt: nowIso()
  };

  store.backlogComments.push(comment);

  writeActivityLog({
    organizationId: parsed.organizationId,
    userId: input.user.id,
    action: "backlog_task.comment_created",
    entityType: "TaskComment",
    entityId: comment.id,
    metadata: {
      siteId: parsed.siteId,
      taskId: task.id
    }
  });

  return comment;
}

export function listBulkOperationsForSite(
  userId: string,
  organizationId: string,
  siteId: string,
  options?: BulkOperationListOptions
): BulkOperation[] {
  const parsed: BulkOperationListQuery = bulkOperationListQuerySchema.parse(options ?? {});
  const store = getDevStore();
  requireOrganizationAccess({
    userId,
    organizationId,
    permission: "content_operation:preview"
  });

  const site = store.sites.find(
    (candidate) => candidate.id === siteId && candidate.organizationId === organizationId
  );

  if (!site) {
    throw new Error("SITE_NOT_FOUND");
  }

  return store.bulkOperations
    .filter((operation) => {
      const scopeMatches =
        operation.organizationId === organizationId && operation.siteId === siteId;
      const statusMatches = parsed.status ? operation.status === parsed.status : true;
      return scopeMatches && statusMatches;
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, parsed.limit ?? 5)
    .map((operation) => ({
      ...operation,
      items: store.bulkOperationItems.filter((item) => item.bulkOperationId === operation.id)
    }));
}

export function createBulkOperationPreview(
  input: BulkOperationPreviewCreateInput & {
    user: AppUser;
  }
): BulkOperation {
  const parsed = bulkOperationPreviewCreateSchema.parse(input);
  const store = getDevStore();
  requireOrganizationAccess({
    userId: input.user.id,
    organizationId: parsed.organizationId,
    permission: "content_operation:preview"
  });

  const task = store.backlogTasks.find(
    (candidate) =>
      candidate.id === parsed.taskId &&
      candidate.organizationId === parsed.organizationId &&
      candidate.siteId === parsed.siteId
  );

  if (!task) {
    throw new Error("BACKLOG_TASK_NOT_FOUND");
  }

  const timestamp = nowIso();
  const preview = buildDevBulkOperationPreview(task);
  const operation: BulkOperation = {
    id: randomUUID(),
    organizationId: parsed.organizationId,
    siteId: parsed.siteId,
    type: "BACKLOG_TASK_PREVIEW",
    status: "PREVIEWED",
    preview,
    dryRunResult: null,
    confirmedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    items: []
  };
  const item: BulkOperationItem = {
    id: randomUUID(),
    bulkOperationId: operation.id,
    externalId: task.url,
    status: "PREVIEWED",
    beforeValue: preview.beforeValue,
    afterValue: preview.afterValue,
    error: null,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  operation.items = [item];
  store.bulkOperations.push(operation);
  store.bulkOperationItems.push(item);
  writeActivityLog({
    organizationId: parsed.organizationId,
    userId: input.user.id,
    action: "bulk_operation.preview_created",
    entityType: "BulkOperation",
    entityId: operation.id,
    metadata: {
      siteId: parsed.siteId,
      taskId: task.id,
      type: operation.type,
      itemCount: 1
    }
  });

  return operation;
}

export function runBulkOperationDryRun(
  input: BulkOperationDryRunInput & {
    user: AppUser;
  }
): BulkOperation {
  const parsed = bulkOperationDryRunSchema.parse(input);
  const store = getDevStore();
  requireOrganizationAccess({
    userId: input.user.id,
    organizationId: parsed.organizationId,
    permission: "content_operation:preview"
  });

  const operation = store.bulkOperations.find(
    (candidate) =>
      candidate.id === parsed.operationId &&
      candidate.organizationId === parsed.organizationId &&
      candidate.siteId === parsed.siteId
  );

  if (!operation) {
    throw new Error("BULK_OPERATION_NOT_FOUND");
  }

  if (operation.status !== "PREVIEWED") {
    throw new Error("BULK_OPERATION_NOT_READY");
  }

  const items = store.bulkOperationItems.filter((item) => item.bulkOperationId === operation.id);
  const dryRunResult = buildDevBulkOperationDryRunResult(operation, items);
  const timestamp = nowIso();

  operation.status = "DRY_RUN_PASSED";
  operation.dryRunResult = dryRunResult;
  operation.updatedAt = timestamp;

  for (const item of items) {
    item.status = "DRY_RUN_PASSED";
    item.error = null;
    item.updatedAt = timestamp;
  }

  operation.items = items;
  writeActivityLog({
    organizationId: parsed.organizationId,
    userId: input.user.id,
    action: "bulk_operation.dry_run_passed",
    entityType: "BulkOperation",
    entityId: operation.id,
    metadata: {
      siteId: parsed.siteId,
      type: operation.type,
      itemCount: items.length,
      noMutation: true
    }
  });

  return operation;
}

export function confirmBulkOperation(
  input: BulkOperationConfirmInput & {
    user: AppUser;
  }
): BulkOperation {
  const parsed = bulkOperationConfirmSchema.parse(input);
  const store = getDevStore();
  requireOrganizationAccess({
    userId: input.user.id,
    organizationId: parsed.organizationId,
    permission: "content_operation:confirm"
  });

  const operation = store.bulkOperations.find(
    (candidate) =>
      candidate.id === parsed.operationId &&
      candidate.organizationId === parsed.organizationId &&
      candidate.siteId === parsed.siteId
  );

  if (!operation) {
    throw new Error("BULK_OPERATION_NOT_FOUND");
  }

  if (operation.status !== "DRY_RUN_PASSED") {
    throw new Error("BULK_OPERATION_NOT_READY");
  }

  const items = store.bulkOperationItems.filter((item) => item.bulkOperationId === operation.id);
  const timestamp = nowIso();

  operation.status = "CONFIRMED";
  operation.confirmedAt = timestamp;
  operation.updatedAt = timestamp;

  for (const item of items) {
    item.status = "CONFIRMED";
    item.error = null;
    item.updatedAt = timestamp;
  }

  operation.items = items;
  writeActivityLog({
    organizationId: parsed.organizationId,
    userId: input.user.id,
    action: "bulk_operation.confirmed",
    entityType: "BulkOperation",
    entityId: operation.id,
    metadata: {
      siteId: parsed.siteId,
      type: operation.type,
      itemCount: items.length,
      noMutation: true
    }
  });

  return operation;
}

export function startBulkOperation(
  input: BulkOperationStartInput & {
    user: AppUser;
  }
): BulkOperation {
  const parsed = bulkOperationStartSchema.parse(input);
  const store = getDevStore();
  requireOrganizationAccess({
    userId: input.user.id,
    organizationId: parsed.organizationId,
    permission: "content_operation:confirm"
  });

  const operation = store.bulkOperations.find(
    (candidate) =>
      candidate.id === parsed.operationId &&
      candidate.organizationId === parsed.organizationId &&
      candidate.siteId === parsed.siteId
  );

  if (!operation) {
    throw new Error("BULK_OPERATION_NOT_FOUND");
  }

  if (operation.status !== "CONFIRMED") {
    throw new Error("BULK_OPERATION_NOT_READY");
  }

  const items = store.bulkOperationItems.filter((item) => item.bulkOperationId === operation.id);
  const timestamp = nowIso();

  operation.status = "RUNNING";
  operation.updatedAt = timestamp;

  for (const item of items) {
    item.status = "RUNNING";
    item.error = null;
    item.updatedAt = timestamp;
  }

  operation.items = items;
  writeActivityLog({
    organizationId: parsed.organizationId,
    userId: input.user.id,
    action: "bulk_operation.started",
    entityType: "BulkOperation",
    entityId: operation.id,
    metadata: {
      siteId: parsed.siteId,
      type: operation.type,
      itemCount: items.length,
      noMutation: true
    }
  });

  return operation;
}

export function finishBulkOperation(
  input: BulkOperationResultInput & {
    user: AppUser;
  }
): BulkOperation {
  const parsed = bulkOperationResultSchema.parse(input);
  const store = getDevStore();
  requireOrganizationAccess({
    userId: input.user.id,
    organizationId: parsed.organizationId,
    permission: "content_operation:confirm"
  });

  const operation = store.bulkOperations.find(
    (candidate) =>
      candidate.id === parsed.operationId &&
      candidate.organizationId === parsed.organizationId &&
      candidate.siteId === parsed.siteId
  );

  if (!operation) {
    throw new Error("BULK_OPERATION_NOT_FOUND");
  }

  if (operation.status !== "RUNNING") {
    throw new Error("BULK_OPERATION_NOT_READY");
  }

  const resultByItemId = new Map(
    (parsed.itemResults ?? []).map((result) => [result.itemId, result])
  );

  if (resultByItemId.size !== (parsed.itemResults ?? []).length) {
    throw new Error("BULK_OPERATION_ITEM_DUPLICATE");
  }

  const items = store.bulkOperationItems.filter((item) => item.bulkOperationId === operation.id);
  const itemIds = new Set(items.map((item) => item.id));
  for (const itemId of resultByItemId.keys()) {
    if (!itemIds.has(itemId)) {
      throw new Error("BULK_OPERATION_ITEM_NOT_FOUND");
    }
  }

  const timestamp = nowIso();
  let failedItemCount = 0;

  for (const item of items) {
    const explicitResult = resultByItemId.get(item.id);
    const status = explicitResult?.status ?? parsed.status;
    item.status = status;
    item.error =
      status === "FAILED" ? (explicitResult?.error ?? parsed.message ?? "Item failed.") : null;
    item.updatedAt = timestamp;

    if (item.status === "FAILED") {
      failedItemCount += 1;
    }
  }

  operation.status = parsed.status === "FAILED" || failedItemCount > 0 ? "FAILED" : "COMPLETED";
  operation.updatedAt = timestamp;
  operation.items = items;
  writeActivityLog({
    organizationId: parsed.organizationId,
    userId: input.user.id,
    action: operation.status === "COMPLETED" ? "bulk_operation.completed" : "bulk_operation.failed",
    entityType: "BulkOperation",
    entityId: operation.id,
    metadata: {
      siteId: parsed.siteId,
      type: operation.type,
      itemCount: items.length,
      failedItemCount,
      message: parsed.message ?? null,
      noMutation: true
    }
  });
  writeNotification({
    organizationId: parsed.organizationId,
    ...buildBulkOperationNotification({
      event: operation.status === "COMPLETED" ? "completed" : "failed",
      itemCount: items.length,
      failedItemCount,
      message: parsed.message ?? null
    })
  });

  return operation;
}

export function rollbackBulkOperation(
  input: BulkOperationRollbackInput & {
    user: AppUser;
  }
): BulkOperation {
  const parsed = bulkOperationRollbackSchema.parse(input);
  const store = getDevStore();
  requireOrganizationAccess({
    userId: input.user.id,
    organizationId: parsed.organizationId,
    permission: "content_operation:confirm"
  });

  const operation = store.bulkOperations.find(
    (candidate) =>
      candidate.id === parsed.operationId &&
      candidate.organizationId === parsed.organizationId &&
      candidate.siteId === parsed.siteId
  );

  if (!operation) {
    throw new Error("BULK_OPERATION_NOT_FOUND");
  }

  if (operation.status !== "COMPLETED" && operation.status !== "FAILED") {
    throw new Error("BULK_OPERATION_NOT_READY");
  }

  const previousStatus = operation.status;
  const items = store.bulkOperationItems.filter((item) => item.bulkOperationId === operation.id);
  const timestamp = nowIso();

  operation.status = "ROLLED_BACK";
  operation.updatedAt = timestamp;

  for (const item of items) {
    item.status = "ROLLED_BACK";
    item.error = null;
    item.updatedAt = timestamp;
  }

  operation.items = items;
  writeActivityLog({
    organizationId: parsed.organizationId,
    userId: input.user.id,
    action: "bulk_operation.rolled_back",
    entityType: "BulkOperation",
    entityId: operation.id,
    metadata: {
      siteId: parsed.siteId,
      type: operation.type,
      previousStatus,
      itemCount: items.length,
      reason: parsed.reason ?? null,
      noMutation: true
    }
  });
  writeNotification({
    organizationId: parsed.organizationId,
    ...buildBulkOperationNotification({
      event: "rolled_back",
      itemCount: items.length,
      reason: parsed.reason ?? null
    })
  });

  return operation;
}

export function retryBulkOperation(
  input: BulkOperationRetryInput & {
    user: AppUser;
  }
): BulkOperation {
  const parsed = bulkOperationRetrySchema.parse(input);
  const store = getDevStore();
  requireOrganizationAccess({
    userId: input.user.id,
    organizationId: parsed.organizationId,
    permission: "content_operation:confirm"
  });

  const operation = store.bulkOperations.find(
    (candidate) =>
      candidate.id === parsed.operationId &&
      candidate.organizationId === parsed.organizationId &&
      candidate.siteId === parsed.siteId
  );

  if (!operation) {
    throw new Error("BULK_OPERATION_NOT_FOUND");
  }

  if (operation.status !== "FAILED") {
    throw new Error("BULK_OPERATION_NOT_READY");
  }

  const items = store.bulkOperationItems.filter((item) => item.bulkOperationId === operation.id);
  const failedItems = items.filter((item) => item.status === "FAILED");

  if (!failedItems.length) {
    throw new Error("BULK_OPERATION_RETRY_NOT_AVAILABLE");
  }

  const previousStatus = operation.status;
  const timestamp = nowIso();

  operation.status = "RUNNING";
  operation.updatedAt = timestamp;

  for (const item of failedItems) {
    item.status = "RUNNING";
    item.error = null;
    item.updatedAt = timestamp;
  }

  operation.items = items;
  writeActivityLog({
    organizationId: parsed.organizationId,
    userId: input.user.id,
    action: "bulk_operation.retry_started",
    entityType: "BulkOperation",
    entityId: operation.id,
    metadata: {
      siteId: parsed.siteId,
      type: operation.type,
      previousStatus,
      itemCount: items.length,
      retryItemCount: failedItems.length,
      reason: parsed.reason ?? null,
      noMutation: true
    }
  });
  writeNotification({
    organizationId: parsed.organizationId,
    ...buildBulkOperationNotification({
      event: "retry_started",
      itemCount: items.length,
      retryItemCount: failedItems.length,
      reason: parsed.reason ?? null
    })
  });

  return operation;
}

function withBacklogDetails(
  task: BacklogTask,
  comments: BacklogTaskComment[],
  activityLogs: ActivityLog[],
  limit: number
): BacklogTask {
  return {
    ...task,
    comments: getBacklogCommentsForTask(task.id, comments, limit),
    activityLogs: getBacklogActivityForTask(task.id, task.siteId, activityLogs, limit)
  };
}

function getBacklogCommentsForTask(
  taskId: string,
  comments: BacklogTaskComment[],
  limit: number
): BacklogTaskComment[] {
  return comments
    .filter((comment) => comment.taskId === taskId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, limit);
}

function getBacklogActivityForTask(
  taskId: string,
  siteId: string,
  activityLogs: ActivityLog[],
  limit: number
): ActivityLog[] {
  return activityLogs
    .filter((log) => {
      if (readMetadataString(log.metadata, "siteId") !== siteId) {
        return false;
      }

      if (log.entityType === "BacklogTask") {
        return log.entityId === taskId;
      }

      return (
        log.entityType === "TaskComment" && readMetadataString(log.metadata, "taskId") === taskId
      );
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, limit);
}

function buildDevBulkOperationPreview(task: BacklogTask): {
  noMutation: true;
  summary: string;
  taskId: string;
  beforeValue: Record<string, string | number | boolean | null>;
  afterValue: Record<string, string | boolean>;
  safeguards: string[];
} {
  return {
    noMutation: true,
    summary: `Preview recommended SEO work for ${task.url}.`,
    taskId: task.id,
    beforeValue: {
      url: task.url,
      issueType: task.issueType,
      status: task.status,
      severity: task.severity,
      potentialImpact: task.potentialImpact,
      effortEstimate: task.effortEstimate,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt
    },
    afterValue: {
      recommendedAction: task.title,
      expectedWorkflow: "manual_review_then_dry_run",
      nextRequiredStep: "dry_run",
      noMutation: true
    },
    safeguards: ["preview_only", "no_wordpress_write", "dry_run_required", "confirmation_required"]
  };
}

function buildDevBulkOperationDryRunResult(
  operation: BulkOperation,
  items: BulkOperationItem[]
): {
  noMutation: true;
  operationId: string;
  type: string;
  status: "passed";
  checkedAt: string;
  itemCount: number;
  passedItems: number;
  failedItems: 0;
  checks: string[];
  nextRequiredStep: "confirmation";
} {
  return {
    noMutation: true,
    operationId: operation.id,
    type: operation.type,
    status: "passed",
    checkedAt: nowIso(),
    itemCount: items.length,
    passedItems: items.length,
    failedItems: 0,
    checks: [
      "tenant_scope_valid",
      "preview_payload_present",
      "wordpress_write_skipped",
      "confirmation_still_required"
    ],
    nextRequiredStep: "confirmation"
  };
}

function readMetadataString(
  metadata: Record<string, string | number | boolean | null>,
  key: string
): string | null {
  const value = metadata[key];
  return typeof value === "string" ? value : null;
}

const backlogTaskStatuses = [
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
  "SNOOZED",
  "IGNORED"
] satisfies BacklogTask["status"][];

const backlogTaskSeverities = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL"
] satisfies BacklogTask["severity"][];

function summarizeBacklogTasks(tasks: BacklogTask[]): BacklogTaskSummary {
  const summary: BacklogTaskSummary = {
    total: tasks.length,
    open: 0,
    done: 0,
    byStatus: Object.fromEntries(backlogTaskStatuses.map((status) => [status, 0])) as Record<
      BacklogTask["status"],
      number
    >,
    bySeverity: Object.fromEntries(
      backlogTaskSeverities.map((severity) => [severity, 0])
    ) as Record<BacklogTask["severity"], number>
  };

  for (const task of tasks) {
    summary.byStatus[task.status] += 1;
    summary.bySeverity[task.severity] += 1;
  }

  summary.open = summary.byStatus.TODO + summary.byStatus.IN_PROGRESS + summary.byStatus.IN_REVIEW;
  summary.done = summary.byStatus.DONE;

  return summary;
}

export function listMembersForOrganization(
  userId: string,
  organizationId: string
): OrganizationMemberSummary[] {
  requireOrganizationAccess({
    userId,
    organizationId,
    permission: "organization:read"
  });

  const store = getDevStore();

  return store.members
    .filter((member) => member.organizationId === organizationId)
    .map((member) => {
      const user = store.users.find((candidate) => candidate.id === member.userId);

      return mapMemberSummary(member, user);
    });
}

export function inviteMember(input: InviteMemberInputWithUser): InviteResult {
  const parsed: InviteMemberInput = inviteMemberSchema.parse(input);
  const store = getDevStore();
  requireOrganizationAccess({
    userId: input.user.id,
    organizationId: parsed.organizationId,
    permission: "members:invite"
  });

  const invitedUser = ensurePlaceholderUser(parsed.email);
  const existing = store.members.find(
    (member) => member.organizationId === parsed.organizationId && member.userId === invitedUser.id
  );

  if (existing) {
    throw new Error("MEMBER_ALREADY_EXISTS");
  }

  const invite = createInviteToken();
  const member: StoreOrganizationMember = {
    id: randomUUID(),
    organizationId: parsed.organizationId,
    userId: invitedUser.id,
    role: parsed.role,
    status: "INVITED",
    invitedEmail: parsed.email,
    inviteExpiresAt: invite.expiresAt.toISOString()
  };

  member.inviteTokenHash = invite.tokenHash;
  store.members.push(member);
  writeActivityLog({
    organizationId: parsed.organizationId,
    userId: input.user.id,
    action: "member.invited",
    entityType: "OrganizationMember",
    entityId: member.id,
    metadata: {
      email: parsed.email,
      role: parsed.role
    }
  });

  return {
    member: mapMemberSummary(member, invitedUser),
    inviteUrl: buildInviteUrl(invite.token),
    expiresAt: invite.expiresAt.toISOString()
  };
}

export function resendInvite(input: MemberMutationInputWithUser): InviteResult {
  const store = getDevStore();
  requireOrganizationAccess({
    userId: input.user.id,
    organizationId: input.organizationId,
    permission: "members:invite"
  });

  const member = store.members.find(
    (candidate) =>
      candidate.id === input.memberId && candidate.organizationId === input.organizationId
  );

  if (!member) {
    throw new Error("MEMBER_NOT_FOUND");
  }

  if (member.status !== "INVITED") {
    throw new Error("INVITE_NOT_PENDING");
  }

  const invite = createInviteToken();
  member.inviteTokenHash = invite.tokenHash;
  member.inviteExpiresAt = invite.expiresAt.toISOString();
  member.inviteAcceptedAt = null;
  member.inviteCanceledAt = null;

  const invitedUser = store.users.find((candidate) => candidate.id === member.userId);
  writeActivityLog({
    organizationId: input.organizationId,
    userId: input.user.id,
    action: "member.invite_resent",
    entityType: "OrganizationMember",
    entityId: member.id,
    metadata: {
      email: member.invitedEmail ?? invitedUser?.email ?? "unknown@example.com",
      role: member.role
    }
  });

  return {
    member: mapMemberSummary(member, invitedUser),
    inviteUrl: buildInviteUrl(invite.token),
    expiresAt: invite.expiresAt.toISOString()
  };
}

export function cancelInvite(input: MemberMutationInputWithUser): OrganizationMemberSummary {
  const store = getDevStore();
  requireOrganizationAccess({
    userId: input.user.id,
    organizationId: input.organizationId,
    permission: "members:manage"
  });

  const member = store.members.find(
    (candidate) =>
      candidate.id === input.memberId && candidate.organizationId === input.organizationId
  );

  if (!member) {
    throw new Error("MEMBER_NOT_FOUND");
  }

  if (member.status !== "INVITED") {
    throw new Error("INVITE_NOT_PENDING");
  }

  member.status = "CANCELED";
  member.inviteTokenHash = null;
  member.inviteExpiresAt = null;
  member.inviteCanceledAt = nowIso();

  const invitedUser = store.users.find((candidate) => candidate.id === member.userId);
  writeActivityLog({
    organizationId: input.organizationId,
    userId: input.user.id,
    action: "member.invite_canceled",
    entityType: "OrganizationMember",
    entityId: member.id,
    metadata: {
      email: member.invitedEmail ?? invitedUser?.email ?? "unknown@example.com",
      role: member.role
    }
  });

  return mapMemberSummary(member, invitedUser);
}

export function acceptInvite(input: AcceptInviteInputWithUser): OrganizationMemberSummary {
  const parsed = acceptInviteSchema.parse({ token: input.token });
  const store = getDevStore();
  const tokenHash = hashInviteToken(parsed.token);
  const member = store.members.find((candidate) => candidate.inviteTokenHash === tokenHash);

  if (!member) {
    throw new Error("INVITE_NOT_FOUND");
  }

  if (member.status !== "INVITED") {
    throw new Error("INVITE_NOT_PENDING");
  }

  if (!member.inviteExpiresAt || new Date(member.inviteExpiresAt) <= new Date()) {
    throw new Error("INVITE_EXPIRED");
  }

  let invitedUser = store.users.find((candidate) => candidate.id === member.userId);

  if (invitedUser?.email !== input.user.email) {
    throw new Error("INVITE_EMAIL_MISMATCH");
  }

  if (member.userId !== input.user.id) {
    member.userId = input.user.id;
    invitedUser = ensureUser(input.user);
  }

  member.status = "ACTIVE";
  member.inviteTokenHash = null;
  member.inviteExpiresAt = null;
  member.inviteAcceptedAt = nowIso();
  ensureUser(input.user);

  writeActivityLog({
    organizationId: member.organizationId,
    userId: input.user.id,
    action: "member.accepted_invite",
    entityType: "OrganizationMember",
    entityId: member.id,
    metadata: {
      email: input.user.email,
      role: member.role
    }
  });

  return mapMemberSummary(member, invitedUser);
}

export function updateMemberRole(input: UpdateMemberRoleInputWithUser): OrganizationMemberSummary {
  const parsed: UpdateMemberRoleInput = updateMemberRoleSchema.parse(input);
  const store = getDevStore();
  requireOrganizationAccess({
    userId: input.user.id,
    organizationId: parsed.organizationId,
    permission: "members:manage"
  });

  const member = store.members.find(
    (candidate) =>
      candidate.id === parsed.memberId && candidate.organizationId === parsed.organizationId
  );

  if (!member) {
    throw new Error("MEMBER_NOT_FOUND");
  }

  if (member.userId === input.user.id) {
    throw new Error("CANNOT_CHANGE_OWN_ROLE");
  }

  if (member.role === "OWNER") {
    throw new Error("OWNER_ROLE_IS_PROTECTED");
  }

  member.role = parsed.role;
  writeActivityLog({
    organizationId: parsed.organizationId,
    userId: input.user.id,
    action: "member.role_updated",
    entityType: "OrganizationMember",
    entityId: member.id,
    metadata: {
      role: parsed.role
    }
  });

  const user = store.users.find((candidate) => candidate.id === member.userId);

  return mapMemberSummary(member, user);
}

export function addMemberForTest(input: {
  organizationId: string;
  userId: string;
  role: Role;
}): OrganizationMember {
  const member: OrganizationMember = {
    id: randomUUID(),
    organizationId: input.organizationId,
    userId: input.userId,
    role: input.role,
    status: "ACTIVE"
  };

  getDevStore().members.push(member);
  return member;
}

function writeActivityLog(input: Omit<ActivityLog, "id" | "createdAt">): ActivityLog {
  const activityLog: ActivityLog = {
    ...input,
    id: randomUUID(),
    createdAt: nowIso()
  };

  getDevStore().activityLogs.push(activityLog);
  return activityLog;
}

function writeNotification(input: Omit<Notification, "id" | "readAt" | "createdAt">): Notification {
  const notification: Notification = {
    ...input,
    id: randomUUID(),
    readAt: null,
    createdAt: nowIso()
  };

  getDevStore().notifications.push(notification);
  return notification;
}

function mapMemberSummary(
  member: StoreOrganizationMember,
  user: AppUser | undefined
): OrganizationMemberSummary {
  return {
    id: member.id,
    organizationId: member.organizationId,
    userId: member.userId,
    role: member.role,
    status: member.status,
    email: user?.email ?? member.invitedEmail ?? "unknown@example.com",
    name: user?.name ?? null,
    invitedEmail: member.invitedEmail ?? null,
    inviteExpiresAt: member.inviteExpiresAt ?? null,
    inviteAcceptedAt: member.inviteAcceptedAt ?? null,
    inviteCanceledAt: member.inviteCanceledAt ?? null,
    createdAt: nowIso()
  };
}
