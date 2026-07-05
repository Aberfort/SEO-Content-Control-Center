import type { Prisma } from "@prisma/client";
import { prisma } from "@sccc/database";
import {
  acceptInviteSchema,
  assertPermission,
  auditIssueListQuerySchema,
  auditListQuerySchema,
  assistantRecommendationListQuerySchema,
  backlogTaskCommentCreateSchema,
  backlogTaskFromAuditIssueSchema,
  backlogTaskFromCandidateSchema,
  backlogTaskListQuerySchema,
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
  planLimits,
  siteCreateSchema,
  updateAuditIssueStatusSchema,
  updateBacklogTaskAssignmentSchema,
  updateBacklogTaskStatusSchema,
  updateMemberRoleSchema,
  type AcceptInviteInput,
  type AssistantRecommendationListQuery,
  type AuditIssueListQuery,
  type AuditListQuery,
  type BacklogTaskCommentCreateInput,
  type BacklogTaskFromAuditIssueInput,
  type BacklogTaskFromCandidateInput,
  type BacklogTaskListQuery,
  type BulkOperationConfirmInput,
  type BulkOperationDryRunInput,
  type BulkOperationPreviewCreateInput,
  type BulkOperationResultInput,
  type BulkOperationRetryInput,
  type BulkOperationRollbackInput,
  type BulkOperationStartInput,
  type InviteMemberInput,
  type NotificationListQuery,
  type NotificationReadUpdateInput,
  type Permission,
  type SiteCreateInput,
  type UpdateAuditIssueStatusInput,
  type UpdateBacklogTaskAssignmentInput,
  type UpdateBacklogTaskStatusInput,
  type UpdateMemberRoleInput
} from "@sccc/shared";

import {
  acceptInvite as acceptDevInvite,
  cancelInvite as cancelDevInvite,
  createBacklogTaskComment as createDevBacklogTaskComment,
  createBacklogTaskFromAuditIssue as createDevBacklogTaskFromAuditIssue,
  createBacklogTaskFromCandidate as createDevBacklogTaskFromCandidate,
  createOrganization as createDevOrganization,
  createSite as createDevSite,
  getSyncedContentItem as getDevSyncedContentItem,
  getOrganizationSummary as getDevOrganizationSummary,
  inviteMember as inviteDevMember,
  listActivityLogsForOrganization as listDevActivityLogsForOrganization,
  listAssistantRecommendationsForSite as listDevAssistantRecommendationsForSite,
  listBacklogTaskActivity as listDevBacklogTaskActivity,
  listAuditIssuesForAudit as listDevAuditIssuesForAudit,
  listAuditsForSite as listDevAuditsForSite,
  listBacklogTaskComments as listDevBacklogTaskComments,
  listBacklogTasksForSite as listDevBacklogTasksForSite,
  listBulkOperationsForSite as listDevBulkOperationsForSite,
  confirmBulkOperation as confirmDevBulkOperation,
  finishBulkOperation as finishDevBulkOperation,
  retryBulkOperation as retryDevBulkOperation,
  rollbackBulkOperation as rollbackDevBulkOperation,
  runBulkOperationDryRun as runDevBulkOperationDryRun,
  startBulkOperation as startDevBulkOperation,
  listMembersForOrganization as listDevMembersForOrganization,
  listNotificationsForOrganization as listDevNotificationsForOrganization,
  listOrganizationSummariesForUser as listDevOrganizationSummariesForUser,
  listSitesForOrganization as listDevSitesForOrganization,
  listSyncedContentForSite as listDevSyncedContentForSite,
  resendInvite as resendDevInvite,
  createAuditForSite as createDevAuditForSite,
  createBulkOperationPreview as createDevBulkOperationPreview,
  updateAuditIssueStatus as updateDevAuditIssueStatus,
  updateBacklogTaskAssignment as updateDevBacklogTaskAssignment,
  updateBacklogTaskStatus as updateDevBacklogTaskStatus,
  getBillingOverviewForOrganization as getDevBillingOverviewForOrganization,
  markAllNotificationsRead as markAllDevNotificationsRead,
  updateNotificationReadState as updateDevNotificationReadState,
  updateMemberRole as updateDevMemberRole
} from "./dev-store";
import {
  buildSyncedContentBacklogCandidates,
  buildSyncedContentHealthSignals
} from "./content-health";
import {
  buildAssistantRecommendationFromBacklogTask,
  buildAssistantRecommendationsFromSyncedContent,
  sortAssistantRecommendations
} from "./assistant-recommendations";
import {
  assistantUsageMetric,
  buildAssistantUsage,
  getCurrentUsagePeriod
} from "./assistant-usage";
import {
  buildFallbackBillingPlans,
  findBillingPlan,
  normalizePlanCode,
  sortBillingPlans
} from "./billing-plans";
import { buildBulkOperationNotification } from "./bulk-operation-notifications";
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
  BillingPlan,
  BillingSubscription,
  BulkOperation,
  BulkOperationListOptions,
  InviteResult,
  NotificationBulkUpdateResult,
  Notification,
  NotificationListOptions,
  OrganizationMemberSummary,
  OrganizationSummary,
  Site,
  SyncedContentList,
  SyncedContentListOptions,
  SyncedContentItem
} from "./types";

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

type CreateAuditForSiteInput = {
  user: AppUser;
  organizationId: string;
  siteId: string;
};

type CreateBacklogTaskFromCandidateInput = BacklogTaskFromCandidateInput & {
  user: AppUser;
};

type CreateBacklogTaskFromAuditIssueWithUser = BacklogTaskFromAuditIssueInput & {
  user: AppUser;
};

type UpdateAuditIssueStatusInputWithUser = UpdateAuditIssueStatusInput & {
  user: AppUser;
};

type CreateBacklogTaskCommentInput = BacklogTaskCommentCreateInput & {
  user: AppUser;
};

type UpdateBacklogTaskStatusInputWithUser = UpdateBacklogTaskStatusInput & {
  user: AppUser;
};

type UpdateBacklogTaskAssignmentInputWithUser = UpdateBacklogTaskAssignmentInput & {
  user: AppUser;
};

type CreateBulkOperationPreviewInput = BulkOperationPreviewCreateInput & {
  user: AppUser;
};

type RunBulkOperationDryRunInput = BulkOperationDryRunInput & {
  user: AppUser;
};

type ConfirmBulkOperationInput = BulkOperationConfirmInput & {
  user: AppUser;
};

type StartBulkOperationInput = BulkOperationStartInput & {
  user: AppUser;
};

type FinishBulkOperationInput = BulkOperationResultInput & {
  user: AppUser;
};

type RollbackBulkOperationInput = BulkOperationRollbackInput & {
  user: AppUser;
};

type RetryBulkOperationInput = BulkOperationRetryInput & {
  user: AppUser;
};

type BulkOperationPreviewPayload = Prisma.InputJsonObject & {
  beforeValue: Prisma.InputJsonObject;
  afterValue: Prisma.InputJsonObject;
};

type InviteMemberInputWithUser = {
  user: AppUser;
  organizationId: string;
  email: string;
  role: InviteMemberInput["role"];
};

type UpdateMemberRoleInputWithUser = {
  user: AppUser;
  organizationId: string;
  memberId: string;
  role: UpdateMemberRoleInput["role"];
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

type UpdateNotificationReadStateInput = NotificationReadUpdateInput & {
  user: AppUser;
};

type AppRepository = {
  listOrganizationSummariesForUser(user: AppUser): Promise<OrganizationSummary[]>;
  createOrganization(input: CreateOrganizationInput): Promise<OrganizationSummary>;
  getOrganizationSummary(
    userId: string,
    organizationId: string
  ): Promise<OrganizationSummary | null>;
  createSite(input: CreateSiteInput): Promise<Site>;
  listSitesForOrganization(userId: string, organizationId: string): Promise<Site[]>;
  listActivityLogsForOrganization(userId: string, organizationId: string): Promise<ActivityLog[]>;
  getBillingOverviewForOrganization(
    userId: string,
    organizationId: string
  ): Promise<BillingOverview>;
  listNotificationsForOrganization(
    userId: string,
    organizationId: string,
    options?: NotificationListOptions
  ): Promise<Notification[]>;
  markAllNotificationsRead(
    user: AppUser,
    organizationId: string
  ): Promise<NotificationBulkUpdateResult>;
  updateNotificationReadState(input: UpdateNotificationReadStateInput): Promise<Notification>;
  listSyncedContentForSite(
    userId: string,
    organizationId: string,
    siteId: string,
    options?: SyncedContentListOptions
  ): Promise<SyncedContentList>;
  listAssistantRecommendationsForSite(
    userId: string,
    organizationId: string,
    siteId: string,
    options?: AssistantRecommendationListOptions
  ): Promise<AssistantRecommendationList>;
  listAuditsForSite(
    userId: string,
    organizationId: string,
    siteId: string,
    options?: AuditListOptions
  ): Promise<Audit[]>;
  createAuditForSite(input: CreateAuditForSiteInput): Promise<Audit>;
  listAuditIssuesForAudit(
    userId: string,
    organizationId: string,
    siteId: string,
    auditId: string,
    options?: AuditIssueListOptions
  ): Promise<AuditIssue[]>;
  updateAuditIssueStatus(input: UpdateAuditIssueStatusInputWithUser): Promise<AuditIssue>;
  getSyncedContentItem(
    userId: string,
    organizationId: string,
    siteId: string,
    contentItemId: string
  ): Promise<SyncedContentItem | null>;
  createBacklogTaskFromCandidate(input: CreateBacklogTaskFromCandidateInput): Promise<BacklogTask>;
  createBacklogTaskFromAuditIssue(
    input: CreateBacklogTaskFromAuditIssueWithUser
  ): Promise<BacklogTask>;
  listBacklogTasksForSite(
    userId: string,
    organizationId: string,
    siteId: string,
    options?: BacklogTaskListOptions
  ): Promise<BacklogTaskList>;
  updateBacklogTaskStatus(input: UpdateBacklogTaskStatusInputWithUser): Promise<BacklogTask>;
  updateBacklogTaskAssignment(
    input: UpdateBacklogTaskAssignmentInputWithUser
  ): Promise<BacklogTask>;
  listBacklogTaskComments(
    userId: string,
    organizationId: string,
    siteId: string,
    taskId: string
  ): Promise<BacklogTaskComment[]>;
  listBacklogTaskActivity(
    userId: string,
    organizationId: string,
    siteId: string,
    taskId: string
  ): Promise<ActivityLog[]>;
  createBacklogTaskComment(input: CreateBacklogTaskCommentInput): Promise<BacklogTaskComment>;
  listBulkOperationsForSite(
    userId: string,
    organizationId: string,
    siteId: string,
    options?: BulkOperationListOptions
  ): Promise<BulkOperation[]>;
  createBulkOperationPreview(input: CreateBulkOperationPreviewInput): Promise<BulkOperation>;
  runBulkOperationDryRun(input: RunBulkOperationDryRunInput): Promise<BulkOperation>;
  confirmBulkOperation(input: ConfirmBulkOperationInput): Promise<BulkOperation>;
  startBulkOperation(input: StartBulkOperationInput): Promise<BulkOperation>;
  finishBulkOperation(input: FinishBulkOperationInput): Promise<BulkOperation>;
  rollbackBulkOperation(input: RollbackBulkOperationInput): Promise<BulkOperation>;
  retryBulkOperation(input: RetryBulkOperationInput): Promise<BulkOperation>;
  listMembersForOrganization(
    userId: string,
    organizationId: string
  ): Promise<OrganizationMemberSummary[]>;
  inviteMember(input: InviteMemberInputWithUser): Promise<InviteResult>;
  resendInvite(input: MemberMutationInputWithUser): Promise<InviteResult>;
  cancelInvite(input: MemberMutationInputWithUser): Promise<OrganizationMemberSummary>;
  acceptInvite(input: AcceptInviteInputWithUser): Promise<OrganizationMemberSummary>;
  updateMemberRole(input: UpdateMemberRoleInputWithUser): Promise<OrganizationMemberSummary>;
};

export function getAppRepository(): AppRepository {
  return process.env.SCCC_DATA_STORE === "prisma" && process.env.DATABASE_URL
    ? prismaRepository
    : devStoreRepository;
}

const devStoreRepository: AppRepository = {
  async listOrganizationSummariesForUser(user) {
    return listDevOrganizationSummariesForUser(user);
  },
  async createOrganization(input) {
    return createDevOrganization(input);
  },
  async getOrganizationSummary(userId, organizationId) {
    return getDevOrganizationSummary(userId, organizationId);
  },
  async createSite(input) {
    return createDevSite(input);
  },
  async listSitesForOrganization(userId, organizationId) {
    return listDevSitesForOrganization(userId, organizationId);
  },
  async listActivityLogsForOrganization(userId, organizationId) {
    return listDevActivityLogsForOrganization(userId, organizationId);
  },
  async getBillingOverviewForOrganization(userId, organizationId) {
    return getDevBillingOverviewForOrganization(userId, organizationId);
  },
  async listNotificationsForOrganization(userId, organizationId, options) {
    return listDevNotificationsForOrganization(userId, organizationId, options);
  },
  async markAllNotificationsRead(user, organizationId) {
    return markAllDevNotificationsRead(user, organizationId);
  },
  async updateNotificationReadState(input) {
    return updateDevNotificationReadState(input);
  },
  async listSyncedContentForSite(userId, organizationId, siteId, options) {
    return listDevSyncedContentForSite(userId, organizationId, siteId, options);
  },
  async listAssistantRecommendationsForSite(userId, organizationId, siteId, options) {
    return listDevAssistantRecommendationsForSite(userId, organizationId, siteId, options);
  },
  async listAuditsForSite(userId, organizationId, siteId, options) {
    return listDevAuditsForSite(userId, organizationId, siteId, options);
  },
  async createAuditForSite(input) {
    return createDevAuditForSite(input);
  },
  async listAuditIssuesForAudit(userId, organizationId, siteId, auditId, options) {
    return listDevAuditIssuesForAudit(userId, organizationId, siteId, auditId, options);
  },
  async updateAuditIssueStatus(input) {
    return updateDevAuditIssueStatus(input);
  },
  async getSyncedContentItem(userId, organizationId, siteId, contentItemId) {
    return getDevSyncedContentItem(userId, organizationId, siteId, contentItemId);
  },
  async createBacklogTaskFromCandidate(input) {
    return createDevBacklogTaskFromCandidate(input);
  },
  async createBacklogTaskFromAuditIssue(input) {
    return createDevBacklogTaskFromAuditIssue(input);
  },
  async listBacklogTasksForSite(userId, organizationId, siteId, options) {
    return listDevBacklogTasksForSite(userId, organizationId, siteId, options);
  },
  async updateBacklogTaskStatus(input) {
    return updateDevBacklogTaskStatus(input);
  },
  async updateBacklogTaskAssignment(input) {
    return updateDevBacklogTaskAssignment(input);
  },
  async listBacklogTaskComments(userId, organizationId, siteId, taskId) {
    return listDevBacklogTaskComments(userId, organizationId, siteId, taskId);
  },
  async listBacklogTaskActivity(userId, organizationId, siteId, taskId) {
    return listDevBacklogTaskActivity(userId, organizationId, siteId, taskId);
  },
  async createBacklogTaskComment(input) {
    return createDevBacklogTaskComment(input);
  },
  async listBulkOperationsForSite(userId, organizationId, siteId, options) {
    return listDevBulkOperationsForSite(userId, organizationId, siteId, options);
  },
  async createBulkOperationPreview(input) {
    return createDevBulkOperationPreview(input);
  },
  async runBulkOperationDryRun(input) {
    return runDevBulkOperationDryRun(input);
  },
  async confirmBulkOperation(input) {
    return confirmDevBulkOperation(input);
  },
  async startBulkOperation(input) {
    return startDevBulkOperation(input);
  },
  async finishBulkOperation(input) {
    return finishDevBulkOperation(input);
  },
  async rollbackBulkOperation(input) {
    return rollbackDevBulkOperation(input);
  },
  async retryBulkOperation(input) {
    return retryDevBulkOperation(input);
  },
  async listMembersForOrganization(userId, organizationId) {
    return listDevMembersForOrganization(userId, organizationId);
  },
  async inviteMember(input) {
    return inviteDevMember(input);
  },
  async resendInvite(input) {
    return resendDevInvite(input);
  },
  async cancelInvite(input) {
    return cancelDevInvite(input);
  },
  async acceptInvite(input) {
    return acceptDevInvite(input);
  },
  async updateMemberRole(input) {
    return updateDevMemberRole(input);
  }
};

const prismaRepository: AppRepository = {
  async listOrganizationSummariesForUser(user) {
    await ensureDbUser(user);

    const memberships = await prisma.organizationMember.findMany({
      where: {
        userId: user.id,
        status: "ACTIVE"
      },
      include: {
        organization: {
          include: {
            sites: {
              orderBy: {
                createdAt: "desc"
              }
            },
            activityLogs: {
              orderBy: {
                createdAt: "desc"
              },
              take: 10
            }
          }
        }
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    return memberships.map((membership) => ({
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
      createdAt: membership.organization.createdAt.toISOString(),
      role: membership.role,
      sites: membership.organization.sites.map(mapSite),
      activityLogs: membership.organization.activityLogs.map(mapActivityLog)
    }));
  },

  async createOrganization(input) {
    const parsed = organizationCreateSchema.parse({ name: input.name });
    await ensureDbUser(input.user);

    const organization = await prisma.$transaction(async (tx) => {
      const baseSlug = slugify(parsed.name);
      const slug = await uniqueSlug(baseSlug);

      const created = await tx.organization.create({
        data: {
          name: parsed.name,
          slug,
          members: {
            create: {
              userId: input.user.id,
              role: "OWNER",
              status: "ACTIVE"
            }
          }
        }
      });

      await tx.activityLog.create({
        data: {
          organizationId: created.id,
          userId: input.user.id,
          action: "organization.created",
          entityType: "Organization",
          entityId: created.id,
          metadata: {
            name: created.name,
            slug: created.slug
          }
        }
      });

      return created;
    });

    const summary = await this.getOrganizationSummary(input.user.id, organization.id);

    if (!summary) {
      throw new Error("ORGANIZATION_NOT_FOUND");
    }

    return summary;
  },

  async getOrganizationSummary(userId, organizationId) {
    const membership = await requireDbOrganizationAccess({
      userId,
      organizationId,
      permission: "organization:read"
    });

    const organization = await prisma.organization.findUnique({
      where: {
        id: organizationId
      },
      include: {
        sites: {
          orderBy: {
            createdAt: "desc"
          }
        },
        activityLogs: {
          orderBy: {
            createdAt: "desc"
          },
          take: 10
        }
      }
    });

    if (!organization) {
      return null;
    }

    return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      createdAt: organization.createdAt.toISOString(),
      role: membership.role,
      sites: organization.sites.map(mapSite),
      activityLogs: organization.activityLogs.map(mapActivityLog)
    };
  },

  async createSite(input) {
    const parsed: SiteCreateInput = siteCreateSchema.parse(input);
    await requireDbOrganizationAccess({
      userId: input.user.id,
      organizationId: parsed.organizationId,
      permission: "site:create"
    });

    const normalizedUrl = normalizeUrl(parsed.url);

    try {
      const site = await prisma.$transaction(async (tx) => {
        const created = await tx.site.create({
          data: {
            organizationId: parsed.organizationId,
            name: parsed.name,
            url: normalizedUrl,
            status: "PENDING_CONNECTION"
          }
        });

        await tx.activityLog.create({
          data: {
            organizationId: parsed.organizationId,
            userId: input.user.id,
            action: "site.created",
            entityType: "Site",
            entityId: created.id,
            metadata: {
              name: created.name,
              url: created.url
            }
          }
        });

        return created;
      });

      return mapSite(site);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new Error("SITE_ALREADY_EXISTS");
      }

      throw error;
    }
  },

  async listSitesForOrganization(userId, organizationId) {
    await requireDbOrganizationAccess({
      userId,
      organizationId,
      permission: "site:read"
    });

    const sites = await prisma.site.findMany({
      where: {
        organizationId
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return sites.map(mapSite);
  },

  async listActivityLogsForOrganization(userId, organizationId) {
    await requireDbOrganizationAccess({
      userId,
      organizationId,
      permission: "organization:read"
    });

    const logs = await prisma.activityLog.findMany({
      where: {
        organizationId
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 25
    });

    return logs.map(mapActivityLog);
  },

  async getBillingOverviewForOrganization(userId, organizationId) {
    await requireDbOrganizationAccess({
      userId,
      organizationId,
      permission: "billing:read"
    });

    const [dbPlans, subscription] = await prisma.$transaction([
      prisma.plan.findMany({
        where: {
          isActive: true
        }
      }),
      prisma.subscription.findFirst({
        where: {
          organizationId,
          status: {
            in: ["TRIALING", "ACTIVE", "PAST_DUE", "INCOMPLETE"]
          }
        },
        include: {
          plan: true
        },
        orderBy: {
          updatedAt: "desc"
        }
      })
    ]);

    const plans = sortBillingPlans(dbPlans.map(mapBillingPlan).filter(isBillingPlan));
    const visiblePlans = plans.length > 0 ? plans : buildFallbackBillingPlans();
    const subscriptionSummary = subscription ? mapBillingSubscription(subscription) : null;

    return {
      plans: visiblePlans,
      currentPlan: subscriptionSummary?.plan ?? findBillingPlan(visiblePlans, "TRIAL"),
      subscription: subscriptionSummary,
      isFallbackTrial: !subscriptionSummary
    };
  },

  async listNotificationsForOrganization(userId, organizationId, options) {
    const parsed = normalizeNotificationListOptions(options);
    await requireDbOrganizationAccess({
      userId,
      organizationId,
      permission: "organization:read"
    });

    const notifications = await prisma.notification.findMany({
      where: {
        organizationId,
        ...(parsed.read === "read" ? { readAt: { not: null } } : {}),
        ...(parsed.read === "unread" ? { readAt: null } : {})
      },
      orderBy: {
        createdAt: "desc"
      },
      take: parsed.limit ?? 25
    });

    return notifications.map(mapNotification);
  },

  async markAllNotificationsRead(user, organizationId) {
    await requireDbOrganizationAccess({
      userId: user.id,
      organizationId,
      permission: "organization:read"
    });

    const result = await prisma.notification.updateMany({
      where: {
        organizationId,
        readAt: null
      },
      data: {
        readAt: new Date()
      }
    });

    return {
      updatedCount: result.count
    };
  },

  async updateNotificationReadState(input) {
    const parsed = notificationReadUpdateSchema.parse(input);
    await requireDbOrganizationAccess({
      userId: input.user.id,
      organizationId: parsed.organizationId,
      permission: "organization:read"
    });

    const existing = await prisma.notification.findFirst({
      where: {
        id: parsed.notificationId,
        organizationId: parsed.organizationId
      }
    });

    if (!existing) {
      throw new Error("NOTIFICATION_NOT_FOUND");
    }

    if (parsed.read && existing.readAt) {
      return mapNotification(existing);
    }

    if (!parsed.read && !existing.readAt) {
      return mapNotification(existing);
    }

    const notification = await prisma.notification.update({
      where: {
        id: existing.id
      },
      data: {
        readAt: parsed.read ? new Date() : null
      }
    });

    return mapNotification(notification);
  },

  async listSyncedContentForSite(userId, organizationId, siteId, options) {
    await requireDbOrganizationAccess({
      userId,
      organizationId,
      permission: "site:read"
    });

    const site = await prisma.site.findFirst({
      where: {
        id: siteId,
        organizationId
      }
    });

    if (!site) {
      throw new Error("SITE_NOT_FOUND");
    }

    const normalizedOptions = normalizeSyncedContentListOptions(options);
    const where: Prisma.SyncedContentItemWhereInput = {
      organizationId,
      siteId
    };

    if (normalizedOptions.type) {
      where.type = normalizedOptions.type;
    }

    if (normalizedOptions.status) {
      where.status = normalizedOptions.status;
    }

    if (normalizedOptions.query) {
      where.OR = [
        {
          title: {
            contains: normalizedOptions.query,
            mode: "insensitive"
          }
        },
        {
          url: {
            contains: normalizedOptions.query,
            mode: "insensitive"
          }
        },
        {
          externalId: {
            contains: normalizedOptions.query,
            mode: "insensitive"
          }
        }
      ];
    }

    const [items, total] = await prisma.$transaction([
      prisma.syncedContentItem.findMany({
        where,
        orderBy: [
          {
            modifiedAt: "desc"
          },
          {
            id: "desc"
          }
        ],
        ...(normalizedOptions.cursor
          ? {
              cursor: {
                id: normalizedOptions.cursor
              },
              skip: 1
            }
          : {}),
        take: normalizedOptions.limit + 1
      }),
      prisma.syncedContentItem.count({
        where
      })
    ]);

    const visibleItems = items.slice(0, normalizedOptions.limit);

    return {
      items: visibleItems.map(mapSyncedContentItem),
      nextCursor:
        items.length > normalizedOptions.limit
          ? (visibleItems[visibleItems.length - 1]?.id ?? null)
          : null,
      total
    };
  },

  async listAssistantRecommendationsForSite(userId, organizationId, siteId, options) {
    const parsed = normalizeAssistantRecommendationListOptions(options);
    await requireDbOrganizationAccess({
      userId,
      organizationId,
      permission: "backlog:read"
    });

    const site = await prisma.site.findFirst({
      where: {
        id: siteId,
        organizationId
      }
    });

    if (!site) {
      throw new Error("SITE_NOT_FOUND");
    }

    const usageReferenceDate = new Date();
    const period = getCurrentUsagePeriod(usageReferenceDate);
    const [tasks, contentItems, subscription, usage] = await prisma.$transaction([
      prisma.backlogTask.findMany({
        where: {
          organizationId,
          siteId,
          status: {
            in: ["TODO", "IN_PROGRESS", "IN_REVIEW"]
          }
        },
        include: backlogTaskCommentInclude,
        orderBy: [
          {
            severity: "desc"
          },
          {
            updatedAt: "desc"
          }
        ],
        take: parsed.limit ?? 5
      }),
      prisma.syncedContentItem.findMany({
        where: {
          organizationId,
          siteId
        },
        orderBy: [
          {
            lastSeenAt: "desc"
          },
          {
            id: "desc"
          }
        ],
        take: 25
      }),
      prisma.subscription.findFirst({
        where: {
          organizationId,
          status: {
            in: ["TRIALING", "ACTIVE"]
          }
        },
        include: {
          plan: true
        },
        orderBy: {
          createdAt: "desc"
        }
      }),
      prisma.usageMetric.aggregate({
        where: {
          organizationId,
          metric: assistantUsageMetric,
          periodStart: {
            gte: period.periodStart
          },
          periodEnd: {
            lte: period.periodEnd
          }
        },
        _sum: {
          value: true
        }
      })
    ]);

    const recommendations = [
      ...tasks.map((task) => buildAssistantRecommendationFromBacklogTask(mapBacklogTask(task))),
      ...contentItems.flatMap((item) =>
        buildAssistantRecommendationsFromSyncedContent(mapSyncedContentItem(item))
      )
    ];

    return {
      recommendations: sortAssistantRecommendations(recommendations).slice(0, parsed.limit ?? 5),
      usage: buildAssistantUsage({
        planCode: subscription?.plan.code,
        used: usage._sum.value,
        referenceDate: usageReferenceDate
      })
    };
  },

  async listAuditsForSite(userId, organizationId, siteId, options) {
    const normalizedOptions = normalizeAuditListOptions(options);
    await requireDbOrganizationAccess({
      userId,
      organizationId,
      permission: "audit:read"
    });

    const site = await prisma.site.findFirst({
      where: {
        id: siteId,
        organizationId
      }
    });

    if (!site) {
      throw new Error("SITE_NOT_FOUND");
    }

    const audits = await prisma.audit.findMany({
      where: {
        organizationId,
        siteId,
        ...(normalizedOptions.status ? { status: normalizedOptions.status } : {})
      },
      orderBy: [
        {
          createdAt: "desc"
        },
        {
          id: "desc"
        }
      ],
      take: normalizedOptions.limit ?? 25
    });

    return audits.map(mapAudit);
  },

  async createAuditForSite(input) {
    await requireDbOrganizationAccess({
      userId: input.user.id,
      organizationId: input.organizationId,
      permission: "audit:run"
    });

    const site = await prisma.site.findFirst({
      where: {
        id: input.siteId,
        organizationId: input.organizationId
      }
    });

    if (!site) {
      throw new Error("SITE_NOT_FOUND");
    }

    const audit = await prisma.$transaction(async (tx) => {
      const created = await tx.audit.create({
        data: {
          organizationId: input.organizationId,
          siteId: input.siteId,
          status: "QUEUED"
        }
      });

      await tx.activityLog.create({
        data: {
          organizationId: input.organizationId,
          userId: input.user.id,
          action: "audit.queued",
          entityType: "Audit",
          entityId: created.id,
          metadata: {
            siteId: input.siteId
          }
        }
      });

      return created;
    });

    return mapAudit(audit);
  },

  async listAuditIssuesForAudit(userId, organizationId, siteId, auditId, options) {
    const normalizedOptions = normalizeAuditIssueListOptions(options);
    await requireDbOrganizationAccess({
      userId,
      organizationId,
      permission: "audit:read"
    });

    const audit = await prisma.audit.findFirst({
      where: {
        id: auditId,
        organizationId,
        siteId
      }
    });

    if (!audit) {
      throw new Error("AUDIT_NOT_FOUND");
    }

    const where: Prisma.AuditIssueWhereInput = {
      auditId: audit.id,
      organizationId,
      siteId,
      ...(normalizedOptions.status ? { status: normalizedOptions.status } : {}),
      ...(normalizedOptions.severity ? { severity: normalizedOptions.severity } : {}),
      ...(normalizedOptions.query
        ? {
            OR: [
              {
                issueType: {
                  contains: normalizedOptions.query,
                  mode: "insensitive"
                }
              },
              {
                affectedUrl: {
                  contains: normalizedOptions.query,
                  mode: "insensitive"
                }
              },
              {
                explanation: {
                  contains: normalizedOptions.query,
                  mode: "insensitive"
                }
              },
              {
                recommendedAction: {
                  contains: normalizedOptions.query,
                  mode: "insensitive"
                }
              }
            ]
          }
        : {})
    };

    const issues = await prisma.auditIssue.findMany({
      where,
      orderBy: [
        {
          severity: "desc"
        },
        {
          updatedAt: "desc"
        },
        {
          id: "desc"
        }
      ],
      take: normalizedOptions.limit ?? 100
    });

    return issues.map(mapAuditIssue);
  },

  async updateAuditIssueStatus(input) {
    const parsed = updateAuditIssueStatusSchema.parse(input);
    await requireDbOrganizationAccess({
      userId: input.user.id,
      organizationId: parsed.organizationId,
      permission: "audit:run"
    });

    const issue = await prisma.auditIssue.findFirst({
      where: {
        id: parsed.issueId,
        auditId: parsed.auditId,
        organizationId: parsed.organizationId,
        siteId: parsed.siteId
      }
    });

    if (!issue) {
      throw new Error("AUDIT_ISSUE_NOT_FOUND");
    }

    if (issue.status === parsed.status) {
      return mapAuditIssue(issue);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const nextIssue = await tx.auditIssue.update({
        where: {
          id: issue.id
        },
        data: {
          status: parsed.status
        }
      });

      await tx.activityLog.create({
        data: {
          organizationId: parsed.organizationId,
          userId: input.user.id,
          action: "audit_issue.status_updated",
          entityType: "AuditIssue",
          entityId: nextIssue.id,
          metadata: {
            siteId: parsed.siteId,
            auditId: parsed.auditId,
            issueType: nextIssue.issueType,
            previousStatus: issue.status,
            status: nextIssue.status
          }
        }
      });

      return nextIssue;
    });

    return mapAuditIssue(updated);
  },

  async getSyncedContentItem(userId, organizationId, siteId, contentItemId) {
    await requireDbOrganizationAccess({
      userId,
      organizationId,
      permission: "site:read"
    });

    const item = await prisma.syncedContentItem.findFirst({
      where: {
        id: contentItemId,
        organizationId,
        siteId,
        site: {
          organizationId
        }
      }
    });

    return item ? mapSyncedContentItem(item) : null;
  },

  async createBacklogTaskFromCandidate(input) {
    const parsed = backlogTaskFromCandidateSchema.parse(input);
    await requireDbOrganizationAccess({
      userId: input.user.id,
      organizationId: parsed.organizationId,
      permission: "backlog:update"
    });

    const item = await prisma.syncedContentItem.findFirst({
      where: {
        id: parsed.contentItemId,
        organizationId: parsed.organizationId,
        siteId: parsed.siteId,
        site: {
          organizationId: parsed.organizationId
        }
      }
    });

    if (!item) {
      throw new Error("CONTENT_ITEM_NOT_FOUND");
    }

    const syncedItem = mapSyncedContentItem(item);
    const healthSignals = buildSyncedContentHealthSignals(syncedItem);
    const candidate = buildSyncedContentBacklogCandidates(syncedItem, healthSignals).find(
      (backlogCandidate) => backlogCandidate.id === parsed.candidateId
    );

    if (!candidate) {
      throw new Error("BACKLOG_CANDIDATE_NOT_FOUND");
    }

    const issueType = `synced_content.${candidate.sourceSignalId}`;
    const task = await prisma.$transaction(async (tx) => {
      const existing = await tx.backlogTask.findFirst({
        where: {
          organizationId: parsed.organizationId,
          siteId: parsed.siteId,
          url: syncedItem.url,
          issueType
        }
      });

      if (existing) {
        return existing;
      }

      const created = await tx.backlogTask.create({
        data: {
          organizationId: parsed.organizationId,
          siteId: parsed.siteId,
          title: candidate.title,
          url: syncedItem.url,
          issueType,
          severity: mapCandidatePriorityToSeverity(candidate.priority),
          potentialImpact: candidate.rationale,
          effortEstimate: mapCandidatePriorityToEffort(candidate.priority),
          tags: ["synced-content", candidate.sourceSignalId]
        }
      });

      await tx.activityLog.create({
        data: {
          organizationId: parsed.organizationId,
          userId: input.user.id,
          action: "backlog_task.created_from_candidate",
          entityType: "BacklogTask",
          entityId: created.id,
          metadata: {
            siteId: parsed.siteId,
            contentItemId: parsed.contentItemId,
            candidateId: parsed.candidateId,
            sourceSignalId: candidate.sourceSignalId
          }
        }
      });

      return created;
    });

    return mapBacklogTask(task);
  },

  async createBacklogTaskFromAuditIssue(input) {
    const parsed = backlogTaskFromAuditIssueSchema.parse(input);
    await requireDbOrganizationAccess({
      userId: input.user.id,
      organizationId: parsed.organizationId,
      permission: "backlog:update"
    });

    const issue = await prisma.auditIssue.findFirst({
      where: {
        id: parsed.auditIssueId,
        organizationId: parsed.organizationId,
        siteId: parsed.siteId
      }
    });

    if (!issue) {
      throw new Error("AUDIT_ISSUE_NOT_FOUND");
    }

    const task = await prisma.$transaction(async (tx) => {
      const existing = await tx.backlogTask.findFirst({
        where: {
          organizationId: parsed.organizationId,
          siteId: parsed.siteId,
          auditIssueId: issue.id
        }
      });

      if (existing) {
        return existing;
      }

      const created = await tx.backlogTask.create({
        data: {
          organizationId: parsed.organizationId,
          siteId: parsed.siteId,
          auditIssueId: issue.id,
          title: issue.recommendedAction,
          url: issue.affectedUrl,
          issueType: `audit.${issue.issueType}`,
          severity: issue.severity,
          potentialImpact: issue.potentialImpact ?? issue.explanation,
          effortEstimate: mapIssueSeverityToEffort(issue.severity),
          tags: ["audit", issue.issueType]
        }
      });

      await tx.activityLog.create({
        data: {
          organizationId: parsed.organizationId,
          userId: input.user.id,
          action: "backlog_task.created_from_audit_issue",
          entityType: "BacklogTask",
          entityId: created.id,
          metadata: {
            siteId: parsed.siteId,
            auditIssueId: issue.id,
            issueType: issue.issueType
          }
        }
      });

      return created;
    });

    return mapBacklogTask(task);
  },

  async listBacklogTasksForSite(userId, organizationId, siteId, options) {
    const normalizedOptions = normalizeBacklogTaskListOptions(options);
    await requireDbOrganizationAccess({
      userId,
      organizationId,
      permission: "backlog:read"
    });

    const site = await prisma.site.findFirst({
      where: {
        id: siteId,
        organizationId
      }
    });

    if (!site) {
      throw new Error("SITE_NOT_FOUND");
    }

    const baseWhere: Prisma.BacklogTaskWhereInput = {
      organizationId,
      siteId
    };
    const filteredWhere: Prisma.BacklogTaskWhereInput = {
      ...baseWhere,
      ...(normalizedOptions.status ? { status: normalizedOptions.status } : {}),
      ...(normalizedOptions.severity ? { severity: normalizedOptions.severity } : {}),
      ...(normalizedOptions.query
        ? {
            OR: [
              {
                title: {
                  contains: normalizedOptions.query,
                  mode: "insensitive"
                }
              },
              {
                url: {
                  contains: normalizedOptions.query,
                  mode: "insensitive"
                }
              },
              {
                issueType: {
                  contains: normalizedOptions.query,
                  mode: "insensitive"
                }
              }
            ]
          }
        : {})
    };

    const [tasks, total, statusGroups, severityGroups] = await prisma.$transaction([
      prisma.backlogTask.findMany({
        where: filteredWhere,
        include: backlogTaskCommentInclude,
        orderBy: [
          {
            updatedAt: "desc"
          },
          {
            id: "desc"
          }
        ],
        take: normalizedOptions.limit ?? 50
      }),
      prisma.backlogTask.count({
        where: baseWhere
      }),
      prisma.backlogTask.groupBy({
        by: ["status"],
        where: baseWhere,
        orderBy: {
          status: "asc"
        },
        _count: {
          _all: true
        }
      }),
      prisma.backlogTask.groupBy({
        by: ["severity"],
        where: baseWhere,
        orderBy: {
          severity: "asc"
        },
        _count: {
          _all: true
        }
      })
    ]);
    const taskActivityLogs = await listRecentActivityForBacklogTasks(
      organizationId,
      siteId,
      tasks.map((task) => task.id)
    );

    return {
      items: tasks.map((task) =>
        mapBacklogTask(task, {
          activityLogs: taskActivityLogs.get(task.id) ?? []
        })
      ),
      summary: buildBacklogSummary(total, statusGroups, severityGroups)
    };
  },

  async updateBacklogTaskStatus(input) {
    const parsed = updateBacklogTaskStatusSchema.parse(input);
    await requireDbOrganizationAccess({
      userId: input.user.id,
      organizationId: parsed.organizationId,
      permission: "backlog:update"
    });

    const existing = await prisma.backlogTask.findFirst({
      where: {
        id: parsed.taskId,
        organizationId: parsed.organizationId,
        siteId: parsed.siteId
      }
    });

    if (!existing) {
      throw new Error("BACKLOG_TASK_NOT_FOUND");
    }

    if (existing.status === parsed.status) {
      return mapBacklogTask(existing);
    }

    const task = await prisma.$transaction(async (tx) => {
      const updated = await tx.backlogTask.update({
        where: {
          id: existing.id
        },
        data: {
          status: parsed.status
        }
      });

      await tx.activityLog.create({
        data: {
          organizationId: parsed.organizationId,
          userId: input.user.id,
          action: "backlog_task.status_updated",
          entityType: "BacklogTask",
          entityId: updated.id,
          metadata: {
            siteId: parsed.siteId,
            previousStatus: existing.status,
            status: parsed.status
          }
        }
      });

      return updated;
    });

    return mapBacklogTask(task);
  },

  async updateBacklogTaskAssignment(input) {
    const parsed = updateBacklogTaskAssignmentSchema.parse(input);
    await requireDbOrganizationAccess({
      userId: input.user.id,
      organizationId: parsed.organizationId,
      permission: "backlog:update"
    });

    const existing = await prisma.backlogTask.findFirst({
      where: {
        id: parsed.taskId,
        organizationId: parsed.organizationId,
        siteId: parsed.siteId
      }
    });

    if (!existing) {
      throw new Error("BACKLOG_TASK_NOT_FOUND");
    }

    if (parsed.assigneeId) {
      const assignee = await prisma.organizationMember.findFirst({
        where: {
          organizationId: parsed.organizationId,
          userId: parsed.assigneeId,
          status: "ACTIVE"
        }
      });

      if (!assignee) {
        throw new Error("BACKLOG_ASSIGNEE_NOT_FOUND");
      }
    }

    const nextDueDate =
      parsed.dueDate === undefined ? undefined : normalizeBacklogDueDate(parsed.dueDate);
    const assigneeChanged =
      parsed.assigneeId !== undefined && parsed.assigneeId !== existing.assigneeId;
    const dueDateChanged =
      nextDueDate !== undefined &&
      formatNullableDate(nextDueDate) !== formatNullableDate(existing.dueDate);

    if (!assigneeChanged && !dueDateChanged) {
      return mapBacklogTask(existing);
    }

    const updateData: Prisma.BacklogTaskUpdateInput = {};

    if (parsed.assigneeId !== undefined) {
      updateData.assignee = parsed.assigneeId
        ? {
            connect: {
              id: parsed.assigneeId
            }
          }
        : {
            disconnect: true
          };
    }

    if (nextDueDate !== undefined) {
      updateData.dueDate = nextDueDate;
    }

    const task = await prisma.$transaction(async (tx) => {
      const updated = await tx.backlogTask.update({
        where: {
          id: existing.id
        },
        data: updateData
      });

      await tx.activityLog.create({
        data: {
          organizationId: parsed.organizationId,
          userId: input.user.id,
          action: "backlog_task.assignment_updated",
          entityType: "BacklogTask",
          entityId: updated.id,
          metadata: {
            siteId: parsed.siteId,
            previousAssigneeId: existing.assigneeId,
            assigneeId: updated.assigneeId,
            previousDueDate: existing.dueDate?.toISOString() ?? null,
            dueDate: updated.dueDate?.toISOString() ?? null
          }
        }
      });

      return updated;
    });

    return mapBacklogTask(task);
  },

  async listBacklogTaskComments(userId, organizationId, siteId, taskId) {
    await requireDbOrganizationAccess({
      userId,
      organizationId,
      permission: "backlog:read"
    });

    const task = await prisma.backlogTask.findFirst({
      where: {
        id: taskId,
        organizationId,
        siteId
      }
    });

    if (!task) {
      throw new Error("BACKLOG_TASK_NOT_FOUND");
    }

    const comments = await prisma.taskComment.findMany({
      where: {
        taskId: task.id
      },
      include: {
        author: true
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 50
    });

    return comments.map(mapBacklogTaskComment);
  },

  async listBacklogTaskActivity(userId, organizationId, siteId, taskId) {
    await requireDbOrganizationAccess({
      userId,
      organizationId,
      permission: "backlog:read"
    });

    const task = await prisma.backlogTask.findFirst({
      where: {
        id: taskId,
        organizationId,
        siteId
      }
    });

    if (!task) {
      throw new Error("BACKLOG_TASK_NOT_FOUND");
    }

    const logs = await prisma.activityLog.findMany({
      where: backlogTaskActivityWhere(organizationId, siteId, task.id),
      orderBy: {
        createdAt: "desc"
      },
      take: 25
    });

    return logs.map(mapActivityLog);
  },

  async createBacklogTaskComment(input) {
    const parsed = backlogTaskCommentCreateSchema.parse(input);
    await requireDbOrganizationAccess({
      userId: input.user.id,
      organizationId: parsed.organizationId,
      permission: "backlog:update"
    });

    const task = await prisma.backlogTask.findFirst({
      where: {
        id: parsed.taskId,
        organizationId: parsed.organizationId,
        siteId: parsed.siteId
      }
    });

    if (!task) {
      throw new Error("BACKLOG_TASK_NOT_FOUND");
    }

    const comment = await prisma.$transaction(async (tx) => {
      const created = await tx.taskComment.create({
        data: {
          taskId: task.id,
          authorId: input.user.id,
          body: parsed.body
        },
        include: {
          author: true
        }
      });

      await tx.activityLog.create({
        data: {
          organizationId: parsed.organizationId,
          userId: input.user.id,
          action: "backlog_task.comment_created",
          entityType: "TaskComment",
          entityId: created.id,
          metadata: {
            siteId: parsed.siteId,
            taskId: task.id
          }
        }
      });

      return created;
    });

    return mapBacklogTaskComment(comment);
  },

  async listBulkOperationsForSite(userId, organizationId, siteId, options) {
    const parsed = bulkOperationListQuerySchema.parse(options ?? {});
    await requireDbOrganizationAccess({
      userId,
      organizationId,
      permission: "content_operation:preview"
    });

    const site = await prisma.site.findFirst({
      where: {
        id: siteId,
        organizationId
      }
    });

    if (!site) {
      throw new Error("SITE_NOT_FOUND");
    }

    const operations = await prisma.bulkOperation.findMany({
      where: {
        organizationId,
        siteId,
        ...(parsed.status ? { status: parsed.status } : {})
      },
      include: {
        items: {
          orderBy: {
            createdAt: "asc"
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: parsed.limit ?? 5
    });

    return operations.map(mapBulkOperation);
  },

  async createBulkOperationPreview(input) {
    const parsed = bulkOperationPreviewCreateSchema.parse(input);
    await requireDbOrganizationAccess({
      userId: input.user.id,
      organizationId: parsed.organizationId,
      permission: "content_operation:preview"
    });

    const task = await prisma.backlogTask.findFirst({
      where: {
        id: parsed.taskId,
        organizationId: parsed.organizationId,
        siteId: parsed.siteId,
        site: {
          organizationId: parsed.organizationId
        }
      }
    });

    if (!task) {
      throw new Error("BACKLOG_TASK_NOT_FOUND");
    }

    const preview = buildBulkOperationPreview(task);
    const operation = await prisma.$transaction(async (tx) => {
      const created = await tx.bulkOperation.create({
        data: {
          organizationId: parsed.organizationId,
          siteId: parsed.siteId,
          type: "BACKLOG_TASK_PREVIEW",
          status: "PREVIEWED",
          preview,
          items: {
            create: {
              externalId: task.url,
              status: "PREVIEWED",
              beforeValue: preview.beforeValue,
              afterValue: preview.afterValue
            }
          }
        },
        include: {
          items: true
        }
      });

      await tx.activityLog.create({
        data: {
          organizationId: parsed.organizationId,
          userId: input.user.id,
          action: "bulk_operation.preview_created",
          entityType: "BulkOperation",
          entityId: created.id,
          metadata: {
            siteId: parsed.siteId,
            taskId: task.id,
            type: created.type,
            itemCount: created.items.length
          }
        }
      });

      return created;
    });

    return mapBulkOperation(operation);
  },

  async runBulkOperationDryRun(input) {
    const parsed = bulkOperationDryRunSchema.parse(input);
    await requireDbOrganizationAccess({
      userId: input.user.id,
      organizationId: parsed.organizationId,
      permission: "content_operation:preview"
    });

    const existing = await prisma.bulkOperation.findFirst({
      where: {
        id: parsed.operationId,
        organizationId: parsed.organizationId,
        siteId: parsed.siteId
      },
      include: {
        items: true
      }
    });

    if (!existing) {
      throw new Error("BULK_OPERATION_NOT_FOUND");
    }

    if (existing.status !== "PREVIEWED") {
      throw new Error("BULK_OPERATION_NOT_READY");
    }

    const dryRunResult = buildBulkOperationDryRunResult(existing);
    const operation = await prisma.$transaction(async (tx) => {
      await tx.bulkOperationItem.updateMany({
        where: {
          bulkOperationId: existing.id
        },
        data: {
          status: "DRY_RUN_PASSED",
          error: null
        }
      });
      const updated = await tx.bulkOperation.update({
        where: {
          id: existing.id
        },
        data: {
          status: "DRY_RUN_PASSED",
          dryRunResult
        },
        include: {
          items: {
            orderBy: {
              createdAt: "asc"
            }
          }
        }
      });

      await tx.activityLog.create({
        data: {
          organizationId: parsed.organizationId,
          userId: input.user.id,
          action: "bulk_operation.dry_run_passed",
          entityType: "BulkOperation",
          entityId: updated.id,
          metadata: {
            siteId: parsed.siteId,
            type: updated.type,
            itemCount: updated.items.length,
            noMutation: true
          }
        }
      });

      return updated;
    });

    return mapBulkOperation(operation);
  },

  async confirmBulkOperation(input) {
    const parsed = bulkOperationConfirmSchema.parse(input);
    await requireDbOrganizationAccess({
      userId: input.user.id,
      organizationId: parsed.organizationId,
      permission: "content_operation:confirm"
    });

    const existing = await prisma.bulkOperation.findFirst({
      where: {
        id: parsed.operationId,
        organizationId: parsed.organizationId,
        siteId: parsed.siteId
      },
      include: {
        items: true
      }
    });

    if (!existing) {
      throw new Error("BULK_OPERATION_NOT_FOUND");
    }

    if (existing.status !== "DRY_RUN_PASSED") {
      throw new Error("BULK_OPERATION_NOT_READY");
    }

    const operation = await prisma.$transaction(async (tx) => {
      await tx.bulkOperationItem.updateMany({
        where: {
          bulkOperationId: existing.id
        },
        data: {
          status: "CONFIRMED",
          error: null
        }
      });
      const updated = await tx.bulkOperation.update({
        where: {
          id: existing.id
        },
        data: {
          status: "CONFIRMED",
          confirmedAt: new Date()
        },
        include: {
          items: {
            orderBy: {
              createdAt: "asc"
            }
          }
        }
      });

      await tx.activityLog.create({
        data: {
          organizationId: parsed.organizationId,
          userId: input.user.id,
          action: "bulk_operation.confirmed",
          entityType: "BulkOperation",
          entityId: updated.id,
          metadata: {
            siteId: parsed.siteId,
            type: updated.type,
            itemCount: updated.items.length,
            noMutation: true
          }
        }
      });

      return updated;
    });

    return mapBulkOperation(operation);
  },

  async startBulkOperation(input) {
    const parsed = bulkOperationStartSchema.parse(input);
    await requireDbOrganizationAccess({
      userId: input.user.id,
      organizationId: parsed.organizationId,
      permission: "content_operation:confirm"
    });

    const existing = await prisma.bulkOperation.findFirst({
      where: {
        id: parsed.operationId,
        organizationId: parsed.organizationId,
        siteId: parsed.siteId
      },
      include: {
        items: true
      }
    });

    if (!existing) {
      throw new Error("BULK_OPERATION_NOT_FOUND");
    }

    if (existing.status !== "CONFIRMED") {
      throw new Error("BULK_OPERATION_NOT_READY");
    }

    const operation = await prisma.$transaction(async (tx) => {
      await tx.bulkOperationItem.updateMany({
        where: {
          bulkOperationId: existing.id
        },
        data: {
          status: "RUNNING",
          error: null
        }
      });
      const updated = await tx.bulkOperation.update({
        where: {
          id: existing.id
        },
        data: {
          status: "RUNNING"
        },
        include: {
          items: {
            orderBy: {
              createdAt: "asc"
            }
          }
        }
      });

      await tx.activityLog.create({
        data: {
          organizationId: parsed.organizationId,
          userId: input.user.id,
          action: "bulk_operation.started",
          entityType: "BulkOperation",
          entityId: updated.id,
          metadata: {
            siteId: parsed.siteId,
            type: updated.type,
            itemCount: updated.items.length,
            noMutation: true
          }
        }
      });

      return updated;
    });

    return mapBulkOperation(operation);
  },

  async finishBulkOperation(input) {
    const parsed = bulkOperationResultSchema.parse(input);
    await requireDbOrganizationAccess({
      userId: input.user.id,
      organizationId: parsed.organizationId,
      permission: "content_operation:confirm"
    });

    const existing = await prisma.bulkOperation.findFirst({
      where: {
        id: parsed.operationId,
        organizationId: parsed.organizationId,
        siteId: parsed.siteId
      },
      include: {
        items: true
      }
    });

    if (!existing) {
      throw new Error("BULK_OPERATION_NOT_FOUND");
    }

    if (existing.status !== "RUNNING") {
      throw new Error("BULK_OPERATION_NOT_READY");
    }

    const resultByItemId = new Map(
      (parsed.itemResults ?? []).map((result) => [result.itemId, result])
    );

    if (resultByItemId.size !== (parsed.itemResults ?? []).length) {
      throw new Error("BULK_OPERATION_ITEM_DUPLICATE");
    }

    const existingItemIds = new Set(existing.items.map((item) => item.id));
    for (const itemId of resultByItemId.keys()) {
      if (!existingItemIds.has(itemId)) {
        throw new Error("BULK_OPERATION_ITEM_NOT_FOUND");
      }
    }

    const nextItems = existing.items.map((item) => {
      const explicitResult = resultByItemId.get(item.id);
      const status = explicitResult?.status ?? parsed.status;
      const error =
        status === "FAILED" ? (explicitResult?.error ?? parsed.message ?? "Item failed.") : null;

      return {
        id: item.id,
        status,
        error
      };
    });
    const failedItemCount = nextItems.filter((item) => item.status === "FAILED").length;
    const finalStatus = parsed.status === "FAILED" || failedItemCount > 0 ? "FAILED" : "COMPLETED";
    const operation = await prisma.$transaction(async (tx) => {
      for (const item of nextItems) {
        await tx.bulkOperationItem.update({
          where: {
            id: item.id
          },
          data: {
            status: item.status,
            error: item.error
          }
        });
      }

      const updated = await tx.bulkOperation.update({
        where: {
          id: existing.id
        },
        data: {
          status: finalStatus
        },
        include: {
          items: {
            orderBy: {
              createdAt: "asc"
            }
          }
        }
      });

      await tx.activityLog.create({
        data: {
          organizationId: parsed.organizationId,
          userId: input.user.id,
          action:
            finalStatus === "COMPLETED" ? "bulk_operation.completed" : "bulk_operation.failed",
          entityType: "BulkOperation",
          entityId: updated.id,
          metadata: {
            siteId: parsed.siteId,
            type: updated.type,
            itemCount: updated.items.length,
            failedItemCount,
            message: parsed.message ?? null,
            noMutation: true
          }
        }
      });

      await tx.notification.create({
        data: {
          organizationId: parsed.organizationId,
          ...buildBulkOperationNotification({
            event: finalStatus === "COMPLETED" ? "completed" : "failed",
            itemCount: updated.items.length,
            failedItemCount,
            message: parsed.message ?? null
          })
        }
      });

      return updated;
    });

    return mapBulkOperation(operation);
  },

  async rollbackBulkOperation(input) {
    const parsed = bulkOperationRollbackSchema.parse(input);
    await requireDbOrganizationAccess({
      userId: input.user.id,
      organizationId: parsed.organizationId,
      permission: "content_operation:confirm"
    });

    const existing = await prisma.bulkOperation.findFirst({
      where: {
        id: parsed.operationId,
        organizationId: parsed.organizationId,
        siteId: parsed.siteId
      },
      include: {
        items: true
      }
    });

    if (!existing) {
      throw new Error("BULK_OPERATION_NOT_FOUND");
    }

    if (existing.status !== "COMPLETED" && existing.status !== "FAILED") {
      throw new Error("BULK_OPERATION_NOT_READY");
    }

    const previousStatus = existing.status;
    const operation = await prisma.$transaction(async (tx) => {
      await tx.bulkOperationItem.updateMany({
        where: {
          bulkOperationId: existing.id
        },
        data: {
          status: "ROLLED_BACK",
          error: null
        }
      });
      const updated = await tx.bulkOperation.update({
        where: {
          id: existing.id
        },
        data: {
          status: "ROLLED_BACK"
        },
        include: {
          items: {
            orderBy: {
              createdAt: "asc"
            }
          }
        }
      });

      await tx.activityLog.create({
        data: {
          organizationId: parsed.organizationId,
          userId: input.user.id,
          action: "bulk_operation.rolled_back",
          entityType: "BulkOperation",
          entityId: updated.id,
          metadata: {
            siteId: parsed.siteId,
            type: updated.type,
            previousStatus,
            itemCount: updated.items.length,
            reason: parsed.reason ?? null,
            noMutation: true
          }
        }
      });

      await tx.notification.create({
        data: {
          organizationId: parsed.organizationId,
          ...buildBulkOperationNotification({
            event: "rolled_back",
            itemCount: updated.items.length,
            reason: parsed.reason ?? null
          })
        }
      });

      return updated;
    });

    return mapBulkOperation(operation);
  },

  async retryBulkOperation(input) {
    const parsed = bulkOperationRetrySchema.parse(input);
    await requireDbOrganizationAccess({
      userId: input.user.id,
      organizationId: parsed.organizationId,
      permission: "content_operation:confirm"
    });

    const existing = await prisma.bulkOperation.findFirst({
      where: {
        id: parsed.operationId,
        organizationId: parsed.organizationId,
        siteId: parsed.siteId
      },
      include: {
        items: true
      }
    });

    if (!existing) {
      throw new Error("BULK_OPERATION_NOT_FOUND");
    }

    if (existing.status !== "FAILED") {
      throw new Error("BULK_OPERATION_NOT_READY");
    }

    const failedItems = existing.items.filter((item) => item.status === "FAILED");

    if (!failedItems.length) {
      throw new Error("BULK_OPERATION_RETRY_NOT_AVAILABLE");
    }

    const operation = await prisma.$transaction(async (tx) => {
      await tx.bulkOperationItem.updateMany({
        where: {
          bulkOperationId: existing.id,
          status: "FAILED"
        },
        data: {
          status: "RUNNING",
          error: null
        }
      });
      const updated = await tx.bulkOperation.update({
        where: {
          id: existing.id
        },
        data: {
          status: "RUNNING"
        },
        include: {
          items: {
            orderBy: {
              createdAt: "asc"
            }
          }
        }
      });

      await tx.activityLog.create({
        data: {
          organizationId: parsed.organizationId,
          userId: input.user.id,
          action: "bulk_operation.retry_started",
          entityType: "BulkOperation",
          entityId: updated.id,
          metadata: {
            siteId: parsed.siteId,
            type: updated.type,
            previousStatus: existing.status,
            itemCount: updated.items.length,
            retryItemCount: failedItems.length,
            reason: parsed.reason ?? null,
            noMutation: true
          }
        }
      });

      await tx.notification.create({
        data: {
          organizationId: parsed.organizationId,
          ...buildBulkOperationNotification({
            event: "retry_started",
            itemCount: updated.items.length,
            retryItemCount: failedItems.length,
            reason: parsed.reason ?? null
          })
        }
      });

      return updated;
    });

    return mapBulkOperation(operation);
  },

  async listMembersForOrganization(userId, organizationId) {
    await requireDbOrganizationAccess({
      userId,
      organizationId,
      permission: "organization:read"
    });

    const members = await prisma.organizationMember.findMany({
      where: {
        organizationId
      },
      include: {
        user: true
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    return members.map(mapMember);
  },

  async inviteMember(input) {
    const parsed: InviteMemberInput = inviteMemberSchema.parse(input);
    await requireDbOrganizationAccess({
      userId: input.user.id,
      organizationId: parsed.organizationId,
      permission: "members:invite"
    });

    const invite = createInviteToken();

    try {
      const member = await prisma.$transaction(async (tx) => {
        const invitedUser = await tx.user.upsert({
          where: {
            email: parsed.email
          },
          update: {},
          create: {
            email: parsed.email,
            name: parsed.email
          }
        });

        const created = await tx.organizationMember.create({
          data: {
            organizationId: parsed.organizationId,
            userId: invitedUser.id,
            role: parsed.role,
            status: "INVITED",
            invitedEmail: parsed.email,
            inviteTokenHash: invite.tokenHash,
            inviteExpiresAt: invite.expiresAt
          },
          include: {
            user: true
          }
        });

        await tx.activityLog.create({
          data: {
            organizationId: parsed.organizationId,
            userId: input.user.id,
            action: "member.invited",
            entityType: "OrganizationMember",
            entityId: created.id,
            metadata: {
              email: parsed.email,
              role: parsed.role
            }
          }
        });

        return created;
      });

      return {
        member: mapMember(member),
        inviteUrl: buildInviteUrl(invite.token),
        expiresAt: invite.expiresAt.toISOString()
      };
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new Error("MEMBER_ALREADY_EXISTS");
      }

      throw error;
    }
  },

  async resendInvite(input) {
    await requireDbOrganizationAccess({
      userId: input.user.id,
      organizationId: input.organizationId,
      permission: "members:invite"
    });

    const existing = await prisma.organizationMember.findFirst({
      where: {
        id: input.memberId,
        organizationId: input.organizationId
      },
      include: {
        user: true
      }
    });

    if (!existing) {
      throw new Error("MEMBER_NOT_FOUND");
    }

    if (existing.status !== "INVITED") {
      throw new Error("INVITE_NOT_PENDING");
    }

    const invite = createInviteToken();
    const member = await prisma.$transaction(async (tx) => {
      const updated = await tx.organizationMember.update({
        where: {
          id: input.memberId
        },
        data: {
          inviteTokenHash: invite.tokenHash,
          inviteExpiresAt: invite.expiresAt,
          inviteAcceptedAt: null,
          inviteCanceledAt: null
        },
        include: {
          user: true
        }
      });

      await tx.activityLog.create({
        data: {
          organizationId: input.organizationId,
          userId: input.user.id,
          action: "member.invite_resent",
          entityType: "OrganizationMember",
          entityId: updated.id,
          metadata: {
            email: updated.invitedEmail ?? updated.user.email,
            role: updated.role
          }
        }
      });

      return updated;
    });

    return {
      member: mapMember(member),
      inviteUrl: buildInviteUrl(invite.token),
      expiresAt: invite.expiresAt.toISOString()
    };
  },

  async cancelInvite(input) {
    await requireDbOrganizationAccess({
      userId: input.user.id,
      organizationId: input.organizationId,
      permission: "members:manage"
    });

    const existing = await prisma.organizationMember.findFirst({
      where: {
        id: input.memberId,
        organizationId: input.organizationId
      }
    });

    if (!existing) {
      throw new Error("MEMBER_NOT_FOUND");
    }

    if (existing.status !== "INVITED") {
      throw new Error("INVITE_NOT_PENDING");
    }

    const member = await prisma.$transaction(async (tx) => {
      const updated = await tx.organizationMember.update({
        where: {
          id: input.memberId
        },
        data: {
          status: "CANCELED",
          inviteTokenHash: null,
          inviteExpiresAt: null,
          inviteCanceledAt: new Date()
        },
        include: {
          user: true
        }
      });

      await tx.activityLog.create({
        data: {
          organizationId: input.organizationId,
          userId: input.user.id,
          action: "member.invite_canceled",
          entityType: "OrganizationMember",
          entityId: updated.id,
          metadata: {
            email: updated.invitedEmail ?? updated.user.email,
            role: updated.role
          }
        }
      });

      return updated;
    });

    return mapMember(member);
  },

  async acceptInvite(input) {
    const parsed = acceptInviteSchema.parse({ token: input.token });
    const tokenHash = hashInviteToken(parsed.token);
    const existing = await prisma.organizationMember.findUnique({
      where: {
        inviteTokenHash: tokenHash
      },
      include: {
        user: true
      }
    });

    if (!existing) {
      throw new Error("INVITE_NOT_FOUND");
    }

    if (existing.status !== "INVITED") {
      throw new Error("INVITE_NOT_PENDING");
    }

    if (!existing.inviteExpiresAt || existing.inviteExpiresAt <= new Date()) {
      throw new Error("INVITE_EXPIRED");
    }

    if (existing.user.email !== input.user.email) {
      throw new Error("INVITE_EMAIL_MISMATCH");
    }

    const member = await prisma.$transaction(async (tx) => {
      const updated = await tx.organizationMember.update({
        where: {
          id: existing.id
        },
        data: {
          status: "ACTIVE",
          inviteTokenHash: null,
          inviteExpiresAt: null,
          inviteAcceptedAt: new Date()
        },
        include: {
          user: true
        }
      });

      await tx.activityLog.create({
        data: {
          organizationId: existing.organizationId,
          userId: input.user.id,
          action: "member.accepted_invite",
          entityType: "OrganizationMember",
          entityId: updated.id,
          metadata: {
            email: input.user.email,
            role: updated.role
          }
        }
      });

      return updated;
    });

    return mapMember(member);
  },

  async updateMemberRole(input) {
    const parsed: UpdateMemberRoleInput = updateMemberRoleSchema.parse(input);
    await requireDbOrganizationAccess({
      userId: input.user.id,
      organizationId: parsed.organizationId,
      permission: "members:manage"
    });

    const existing = await prisma.organizationMember.findFirst({
      where: {
        id: parsed.memberId,
        organizationId: parsed.organizationId
      }
    });

    if (!existing) {
      throw new Error("MEMBER_NOT_FOUND");
    }

    if (existing.userId === input.user.id) {
      throw new Error("CANNOT_CHANGE_OWN_ROLE");
    }

    if (existing.role === "OWNER") {
      throw new Error("OWNER_ROLE_IS_PROTECTED");
    }

    const member = await prisma.$transaction(async (tx) => {
      const updated = await tx.organizationMember.update({
        where: {
          id: parsed.memberId
        },
        data: {
          role: parsed.role
        },
        include: {
          user: true
        }
      });

      await tx.activityLog.create({
        data: {
          organizationId: parsed.organizationId,
          userId: input.user.id,
          action: "member.role_updated",
          entityType: "OrganizationMember",
          entityId: updated.id,
          metadata: {
            role: parsed.role
          }
        }
      });

      return updated;
    });

    return mapMember(member);
  }
};

async function ensureDbUser(user: AppUser): Promise<void> {
  await prisma.user.upsert({
    where: {
      id: user.id
    },
    update: {
      email: user.email,
      name: user.name
    },
    create: {
      id: user.id,
      email: user.email,
      name: user.name
    }
  });
}

async function requireDbOrganizationAccess(input: {
  userId: string;
  organizationId: string;
  permission: Permission;
}) {
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId: input.userId,
      organizationId: input.organizationId,
      status: "ACTIVE"
    }
  });

  if (!membership) {
    throw new Error("ORGANIZATION_NOT_FOUND");
  }

  assertPermission(membership.role, input.permission);
  return membership;
}

export async function canAccessOrganization(
  userId: string,
  organizationId: string,
  permission: Permission
): Promise<boolean> {
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId,
      organizationId,
      status: "ACTIVE"
    }
  });

  return membership ? hasPermission(membership.role, permission) : false;
}

async function uniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let suffix = 2;

  while (await prisma.organization.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

function slugify(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "organization";
}

function normalizeUrl(url: string): string {
  const parsed = new URL(url);
  parsed.hash = "";
  parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  return parsed.toString();
}

function normalizeSyncedContentListOptions(
  options: SyncedContentListOptions | undefined
): Required<SyncedContentListOptions> {
  const limit = Number.isFinite(options?.limit)
    ? Math.min(Math.max(Math.trunc(options?.limit ?? 25), 1), 100)
    : 25;

  return {
    query: normalizeOptionalFilter(options?.query, 160),
    type: normalizeOptionalFilter(options?.type, 64),
    status: normalizeOptionalFilter(options?.status, 64),
    cursor: normalizeOptionalFilter(options?.cursor, 191),
    limit
  };
}

function normalizeOptionalFilter(value: string | undefined, maxLength: number): string {
  return value?.trim().slice(0, maxLength) ?? "";
}

function normalizeBacklogTaskListOptions(
  options: BacklogTaskListOptions | undefined
): BacklogTaskListQuery {
  return backlogTaskListQuerySchema.parse({
    query: options?.query,
    status: options?.status,
    severity: options?.severity,
    limit: options?.limit ?? 50
  });
}

function normalizeAssistantRecommendationListOptions(
  options: AssistantRecommendationListOptions | undefined
): AssistantRecommendationListQuery {
  return assistantRecommendationListQuerySchema.parse({
    limit: options?.limit ?? 5
  });
}

function normalizeAuditListOptions(options: AuditListOptions | undefined): AuditListQuery {
  return auditListQuerySchema.parse({
    status: options?.status,
    limit: options?.limit ?? 25
  });
}

function normalizeAuditIssueListOptions(
  options: AuditIssueListOptions | undefined
): AuditIssueListQuery {
  return auditIssueListQuerySchema.parse({
    query: options?.query,
    status: options?.status,
    severity: options?.severity,
    limit: options?.limit ?? 100
  });
}

function normalizeNotificationListOptions(
  options: NotificationListOptions | undefined
): NotificationListQuery {
  return notificationListQuerySchema.parse({
    read: options?.read,
    limit: options?.limit ?? 25
  });
}

function normalizeBacklogDueDate(value: string | null): Date | null {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

function formatNullableDate(value: Date | null): string | null {
  return value?.toISOString() ?? null;
}

const backlogTaskCommentInclude = {
  comments: {
    include: {
      author: true
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 3
  }
} satisfies Prisma.BacklogTaskInclude;

function backlogTaskActivityWhere(
  organizationId: string,
  siteId: string,
  taskId: string
): Prisma.ActivityLogWhereInput {
  return {
    organizationId,
    OR: [
      {
        entityType: "BacklogTask",
        entityId: taskId,
        metadata: {
          path: ["siteId"],
          equals: siteId
        }
      },
      {
        entityType: "TaskComment",
        metadata: {
          path: ["taskId"],
          equals: taskId
        }
      }
    ]
  };
}

async function listRecentActivityForBacklogTasks(
  organizationId: string,
  siteId: string,
  taskIds: string[]
): Promise<Map<string, ActivityLog[]>> {
  const grouped = new Map<string, ActivityLog[]>();

  if (taskIds.length === 0) {
    return grouped;
  }

  const taskIdSet = new Set(taskIds);
  const logs = await prisma.activityLog.findMany({
    where: {
      organizationId,
      OR: [
        {
          entityType: "BacklogTask",
          entityId: {
            in: taskIds
          }
        },
        {
          entityType: "TaskComment"
        }
      ]
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 250
  });

  for (const log of logs) {
    const mappedLog = mapActivityLog(log);
    const taskId =
      mappedLog.entityType === "BacklogTask"
        ? mappedLog.entityId
        : readMetadataString(mappedLog.metadata, "taskId");

    if (
      !taskId ||
      !taskIdSet.has(taskId) ||
      readMetadataString(mappedLog.metadata, "siteId") !== siteId
    ) {
      continue;
    }

    const taskLogs = grouped.get(taskId) ?? [];

    if (taskLogs.length < 3) {
      taskLogs.push(mappedLog);
      grouped.set(taskId, taskLogs);
    }
  }

  return grouped;
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

function buildEmptyBacklogSummary(): BacklogTaskSummary {
  return {
    total: 0,
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
}

function buildBacklogSummary(
  total: number,
  statusGroups: Array<{
    status: BacklogTask["status"];
    _count?: true | { _all?: number };
  }>,
  severityGroups: Array<{
    severity: BacklogTask["severity"];
    _count?: true | { _all?: number };
  }>
): BacklogTaskSummary {
  const summary = buildEmptyBacklogSummary();
  summary.total = total;

  for (const group of statusGroups) {
    summary.byStatus[group.status] = readBacklogGroupCount(group);
  }

  for (const group of severityGroups) {
    summary.bySeverity[group.severity] = readBacklogGroupCount(group);
  }

  summary.open = summary.byStatus.TODO + summary.byStatus.IN_PROGRESS + summary.byStatus.IN_REVIEW;
  summary.done = summary.byStatus.DONE;

  return summary;
}

function readBacklogGroupCount(group: { _count?: true | { _all?: number } }): number {
  return typeof group._count === "object" ? (group._count._all ?? 0) : 0;
}

function mapSite(site: {
  id: string;
  organizationId: string;
  name: string;
  url: string;
  status: Site["status"];
  createdAt: Date;
}): Site {
  return {
    id: site.id,
    organizationId: site.organizationId,
    name: site.name,
    url: site.url,
    status: site.status,
    createdAt: site.createdAt.toISOString()
  };
}

function mapActivityLog(log: {
  id: string;
  organizationId: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: unknown;
  createdAt: Date;
}): ActivityLog {
  return {
    id: log.id,
    organizationId: log.organizationId,
    userId: log.userId,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    metadata: isMetadataObject(log.metadata) ? log.metadata : {},
    createdAt: log.createdAt.toISOString()
  };
}

function mapNotification(notification: {
  id: string;
  organizationId: string;
  type: string;
  title: string;
  body: string;
  readAt: Date | null;
  createdAt: Date;
}): Notification {
  return {
    id: notification.id,
    organizationId: notification.organizationId,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    readAt: notification.readAt?.toISOString() ?? null,
    createdAt: notification.createdAt.toISOString()
  };
}

function mapBillingPlan(plan: {
  id: string;
  code: string;
  name: string;
  monthlyPrice: number;
  isActive: boolean;
  limits: Prisma.JsonValue;
}): BillingPlan | null {
  void plan.limits;

  const code = normalizePlanCode(plan.code);

  if (!code) {
    return null;
  }

  return {
    id: plan.id,
    code,
    name: plan.name,
    monthlyPrice: plan.monthlyPrice,
    limits: planLimits[code],
    isActive: plan.isActive
  };
}

function isBillingPlan(plan: BillingPlan | null): plan is BillingPlan {
  return plan !== null;
}

function mapBillingSubscription(subscription: {
  id: string;
  organizationId: string;
  status: BillingSubscription["status"];
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  provider: string | null;
  createdAt: Date;
  updatedAt: Date;
  plan: {
    id: string;
    code: string;
    name: string;
    monthlyPrice: number;
    isActive: boolean;
    limits: Prisma.JsonValue;
  };
}): BillingSubscription | null {
  const plan = mapBillingPlan(subscription.plan);

  if (!plan) {
    return null;
  }

  return {
    id: subscription.id,
    organizationId: subscription.organizationId,
    status: subscription.status,
    plan,
    trialEndsAt: subscription.trialEndsAt?.toISOString() ?? null,
    currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
    provider: subscription.provider,
    createdAt: subscription.createdAt.toISOString(),
    updatedAt: subscription.updatedAt.toISOString()
  };
}

function mapSyncedContentItem(item: {
  id: string;
  organizationId: string;
  siteId: string;
  externalId: string;
  type: string;
  url: string;
  title: string | null;
  status: string;
  modifiedAt: Date;
  firstSeenAt: Date;
  lastSeenAt: Date;
}): SyncedContentItem {
  return {
    id: item.id,
    organizationId: item.organizationId,
    siteId: item.siteId,
    externalId: item.externalId,
    type: item.type,
    url: item.url,
    title: item.title,
    status: item.status,
    modifiedAt: item.modifiedAt.toISOString(),
    firstSeenAt: item.firstSeenAt.toISOString(),
    lastSeenAt: item.lastSeenAt.toISOString()
  };
}

function mapAudit(audit: {
  id: string;
  organizationId: string;
  siteId: string;
  status: Audit["status"];
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}): Audit {
  return {
    id: audit.id,
    organizationId: audit.organizationId,
    siteId: audit.siteId,
    status: audit.status,
    startedAt: audit.startedAt?.toISOString() ?? null,
    completedAt: audit.completedAt?.toISOString() ?? null,
    createdAt: audit.createdAt.toISOString()
  };
}

function mapAuditIssue(issue: {
  id: string;
  auditId: string;
  organizationId: string;
  siteId: string;
  issueType: string;
  status: AuditIssue["status"];
  severity: AuditIssue["severity"];
  affectedUrl: string;
  evidence: unknown;
  explanation: string;
  recommendedAction: string;
  potentialImpact: string | null;
  fingerprint: string;
  createdAt: Date;
  updatedAt: Date;
}): AuditIssue {
  return {
    id: issue.id,
    auditId: issue.auditId,
    organizationId: issue.organizationId,
    siteId: issue.siteId,
    issueType: issue.issueType,
    status: issue.status,
    severity: issue.severity,
    affectedUrl: issue.affectedUrl,
    evidence: issue.evidence,
    explanation: issue.explanation,
    recommendedAction: issue.recommendedAction,
    potentialImpact: issue.potentialImpact,
    fingerprint: issue.fingerprint,
    createdAt: issue.createdAt.toISOString(),
    updatedAt: issue.updatedAt.toISOString()
  };
}

function mapBacklogTask(
  task: {
    id: string;
    organizationId: string;
    siteId: string;
    auditIssueId: string | null;
    title: string;
    url: string;
    issueType: string;
    status: BacklogTask["status"];
    severity: BacklogTask["severity"];
    potentialImpact: string | null;
    effortEstimate: number | null;
    assigneeId: string | null;
    dueDate: Date | null;
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
    comments?: Array<{
      id: string;
      taskId: string;
      authorId: string;
      body: string;
      createdAt: Date;
      author: {
        email: string;
        name: string | null;
      };
    }>;
  },
  options: {
    activityLogs?: ActivityLog[];
  } = {}
): BacklogTask {
  return {
    id: task.id,
    organizationId: task.organizationId,
    siteId: task.siteId,
    auditIssueId: task.auditIssueId,
    title: task.title,
    url: task.url,
    issueType: task.issueType,
    status: task.status,
    severity: task.severity,
    potentialImpact: task.potentialImpact,
    effortEstimate: task.effortEstimate,
    assigneeId: task.assigneeId,
    dueDate: task.dueDate?.toISOString() ?? null,
    tags: task.tags,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    comments: task.comments?.map(mapBacklogTaskComment) ?? [],
    activityLogs: options.activityLogs
  };
}

function mapBacklogTaskComment(comment: {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: Date;
  author: {
    email: string;
    name: string | null;
  };
}): BacklogTaskComment {
  return {
    id: comment.id,
    taskId: comment.taskId,
    authorId: comment.authorId,
    authorEmail: comment.author.email,
    authorName: comment.author.name,
    body: comment.body,
    createdAt: comment.createdAt.toISOString()
  };
}

function buildBulkOperationPreview(task: {
  id: string;
  title: string;
  url: string;
  issueType: string;
  status: BacklogTask["status"];
  severity: BacklogTask["severity"];
  potentialImpact: string | null;
  effortEstimate: number | null;
  createdAt: Date;
  updatedAt: Date;
}): BulkOperationPreviewPayload {
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
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString()
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

function buildBulkOperationDryRunResult(operation: {
  id: string;
  type: string;
  items: Array<{
    id: string;
    externalId: string;
    status: string;
  }>;
}): Prisma.InputJsonObject {
  return {
    noMutation: true,
    operationId: operation.id,
    type: operation.type,
    status: "passed",
    checkedAt: new Date().toISOString(),
    itemCount: operation.items.length,
    passedItems: operation.items.length,
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

function mapBulkOperation(operation: {
  id: string;
  organizationId: string;
  siteId: string;
  type: string;
  status: BulkOperation["status"];
  preview: unknown;
  dryRunResult: unknown;
  confirmedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  items?: Array<{
    id: string;
    bulkOperationId: string;
    externalId: string;
    status: string;
    beforeValue: unknown;
    afterValue: unknown;
    error: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
}): BulkOperation {
  return {
    id: operation.id,
    organizationId: operation.organizationId,
    siteId: operation.siteId,
    type: operation.type,
    status: operation.status,
    preview: operation.preview,
    dryRunResult: operation.dryRunResult,
    confirmedAt: operation.confirmedAt?.toISOString() ?? null,
    createdAt: operation.createdAt.toISOString(),
    updatedAt: operation.updatedAt.toISOString(),
    items: operation.items?.map(mapBulkOperationItem) ?? []
  };
}

function mapBulkOperationItem(item: {
  id: string;
  bulkOperationId: string;
  externalId: string;
  status: string;
  beforeValue: unknown;
  afterValue: unknown;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}): BulkOperation["items"][number] {
  return {
    id: item.id,
    bulkOperationId: item.bulkOperationId,
    externalId: item.externalId,
    status: item.status,
    beforeValue: item.beforeValue,
    afterValue: item.afterValue,
    error: item.error,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString()
  };
}

function mapCandidatePriorityToSeverity(priority: "low" | "medium" | "high") {
  if (priority === "high") {
    return "HIGH";
  }

  if (priority === "medium") {
    return "MEDIUM";
  }

  return "LOW";
}

function mapCandidatePriorityToEffort(priority: "low" | "medium" | "high"): number {
  if (priority === "high") {
    return 3;
  }

  if (priority === "medium") {
    return 2;
  }

  return 1;
}

function mapIssueSeverityToEffort(severity: BacklogTask["severity"]): number {
  if (severity === "CRITICAL" || severity === "HIGH") {
    return 3;
  }

  if (severity === "MEDIUM") {
    return 2;
  }

  return 1;
}

function mapMember(member: {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationMemberSummary["role"];
  status: OrganizationMemberSummary["status"];
  invitedEmail: string | null;
  inviteExpiresAt?: Date | null;
  inviteAcceptedAt?: Date | null;
  inviteCanceledAt?: Date | null;
  createdAt: Date;
  user: {
    email: string;
    name: string | null;
  };
}): OrganizationMemberSummary {
  return {
    id: member.id,
    organizationId: member.organizationId,
    userId: member.userId,
    role: member.role,
    status: member.status,
    email: member.user.email,
    name: member.user.name,
    invitedEmail: member.invitedEmail,
    inviteExpiresAt: member.inviteExpiresAt?.toISOString() ?? null,
    inviteAcceptedAt: member.inviteAcceptedAt?.toISOString() ?? null,
    inviteCanceledAt: member.inviteCanceledAt?.toISOString() ?? null,
    createdAt: member.createdAt.toISOString()
  };
}

function isMetadataObject(
  input: unknown
): input is Record<string, string | number | boolean | null> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return false;
  }

  return Object.values(input).every(
    (value) =>
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
  );
}

function readMetadataString(
  metadata: Record<string, string | number | boolean | null>,
  key: string
): string | null {
  const value = metadata[key];
  return typeof value === "string" ? value : null;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}
