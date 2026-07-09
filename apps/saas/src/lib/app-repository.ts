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
  backlogTasksFromAuditSchema,
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
  type BacklogTasksFromAuditInput,
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
  type PlanCode,
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
  createBacklogTasksFromAudit as createDevBacklogTasksFromAudit,
  createBacklogTaskFromCandidate as createDevBacklogTaskFromCandidate,
  createOrganization as createDevOrganization,
  createSite as createDevSite,
  getGscConnectionSecretForSite as getDevGscConnectionSecretForSite,
  getSyncedContentItem as getDevSyncedContentItem,
  getGscConnectionOverviewForSite as getDevGscConnectionOverviewForSite,
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
  listSyncedContentUrlsForSite as listDevSyncedContentUrlsForSite,
  listGscDailyMetrics as listDevGscDailyMetrics,
  listGscSearchInsights as listDevGscSearchInsights,
  resendInvite as resendDevInvite,
  createAuditForSite as createDevAuditForSite,
  createBulkOperationPreview as createDevBulkOperationPreview,
  updateAuditIssueStatus as updateDevAuditIssueStatus,
  updateBacklogTaskAssignment as updateDevBacklogTaskAssignment,
  updateBacklogTaskStatus as updateDevBacklogTaskStatus,
  getBillingOverviewForOrganization as getDevBillingOverviewForOrganization,
  getBillingCheckoutContext as getDevBillingCheckoutContext,
  getBillingPortalContext as getDevBillingPortalContext,
  applyBillingWebhookUpdate as applyDevBillingWebhookUpdate,
  markAllNotificationsRead as markAllDevNotificationsRead,
  updateNotificationReadState as updateDevNotificationReadState,
  updateMemberRole as updateDevMemberRole,
  selectGscConnectionProperty as selectDevGscConnectionProperty,
  replaceGscSearchInsights as replaceDevGscSearchInsights,
  upsertGscDailyMetrics as upsertDevGscDailyMetrics,
  upsertGscConnection as upsertDevGscConnection
} from "./dev-store";
import {
  buildSyncedContentBacklogCandidates,
  buildSyncedContentHealthSignals
} from "./content-health";
import { buildAuditIssueInputsFromSyncedContent } from "./audit-issue-generation";
import type { SyncedContentUrlEntry } from "./gsc-content-matching";
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
import { buildBillingActions } from "./billing-actions";
import { assertBillingFeatureAvailable, buildBillingFeatureGates } from "./billing-feature-gates";
import { buildBillingLimitNotification } from "./billing-limit-notifications";
import { isBillingPortalConfigured } from "./billing-portal";
import {
  calculateTrialEndsAt,
  getLocalTrialExpiryGateBlock,
  normalizeLocalTrialStatus
} from "./billing-trial";
import type { BillingWebhookApplyResult, StripeBillingWebhookUpdate } from "./billing-webhook";
import { buildBulkOperationNotification } from "./bulk-operation-notifications";
import {
  buildBulkOperationDryRunPreviewResult,
  buildSafeOperationPreview,
  countExecutableSafeOperationItems
} from "./bulk-operation-preview";
import {
  enqueueBulkOperationExecutionJob,
  enqueueBulkOperationRollbackJob
} from "./bulk-operation-queue";
import { buildGscConnectAction, isGscOAuthConfigured } from "./gsc-oauth";
import { buildInviteUrl, createInviteToken, hashInviteToken } from "./invite-token";
import type {
  ActivityLog,
  AppUser,
  AssistantRecommendationList,
  AssistantRecommendationListOptions,
  Audit,
  AuditIssue,
  AuditIssueSummary,
  AuditIssueListOptions,
  AuditListOptions,
  BacklogTask,
  BacklogTaskComment,
  BacklogTaskList,
  BacklogTaskListOptions,
  BacklogTaskSummary,
  BacklogTasksFromAuditResult,
  BillingOverview,
  BillingCheckoutContext,
  BillingPlan,
  BillingPortalContext,
  BillingSubscription,
  BulkOperation,
  BulkOperationItemStatusSummary,
  BulkOperationListOptions,
  BulkOperationRetryMode,
  GscConnectionSecret,
  GscConnectionOverview,
  GscConnectionSummary,
  GscDailyMetric,
  GscDailyMetricInput,
  GscMetricSyncResult,
  GscSearchInsight,
  GscSearchInsightInput,
  GscSearchInsightSyncResult,
  InviteResult,
  NotificationBulkUpdateResult,
  Notification,
  NotificationListOptions,
  OrganizationMemberSummary,
  OrganizationSummary,
  Site,
  SyncedContentList,
  SyncedContentListOptions,
  SyncedContentItem,
  SyncedContentMetadata
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

type CreateBacklogTasksFromAuditWithUser = BacklogTasksFromAuditInput & {
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

type BillingCheckoutContextInput = {
  user: AppUser;
  organizationId: string;
  planCode: PlanCode;
};

type BillingPortalContextInput = {
  user: AppUser;
  organizationId: string;
};

type UpsertGscConnectionInput = {
  user: AppUser;
  organizationId: string;
  siteId: string;
  googleAccountEmail: string;
  propertyUrl: string;
  encryptedRefreshToken: string;
};

type SelectGscConnectionPropertyInput = UpsertGscConnectionInput;

type UpsertGscDailyMetricsInput = {
  user: AppUser;
  organizationId: string;
  siteId: string;
  propertyUrl: string;
  startDate: string;
  endDate: string;
  metrics: GscDailyMetricInput[];
};

type GscSearchInsightListOptions = {
  propertyUrl?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
};

type ReplaceGscSearchInsightsInput = {
  user: AppUser;
  organizationId: string;
  siteId: string;
  propertyUrl: string;
  startDate: string;
  endDate: string;
  insights: GscSearchInsightInput[];
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
  getBillingCheckoutContext(input: BillingCheckoutContextInput): Promise<BillingCheckoutContext>;
  getBillingPortalContext(input: BillingPortalContextInput): Promise<BillingPortalContext>;
  applyBillingWebhookUpdate(input: StripeBillingWebhookUpdate): Promise<BillingWebhookApplyResult>;
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
  listSyncedContentUrlsForSite(
    userId: string,
    organizationId: string,
    siteId: string
  ): Promise<SyncedContentUrlEntry[]>;
  getGscConnectionOverviewForSite(
    userId: string,
    organizationId: string,
    siteId: string
  ): Promise<GscConnectionOverview>;
  getGscConnectionSecretForSite(
    userId: string,
    organizationId: string,
    siteId: string
  ): Promise<GscConnectionSecret | null>;
  upsertGscConnection(input: UpsertGscConnectionInput): Promise<GscConnectionSummary>;
  selectGscConnectionProperty(
    input: SelectGscConnectionPropertyInput
  ): Promise<GscConnectionSummary>;
  listGscDailyMetrics(
    userId: string,
    organizationId: string,
    siteId: string,
    propertyUrl?: string
  ): Promise<GscDailyMetric[]>;
  upsertGscDailyMetrics(input: UpsertGscDailyMetricsInput): Promise<GscMetricSyncResult>;
  listGscSearchInsights(
    userId: string,
    organizationId: string,
    siteId: string,
    options?: GscSearchInsightListOptions
  ): Promise<GscSearchInsight[]>;
  replaceGscSearchInsights(
    input: ReplaceGscSearchInsightsInput
  ): Promise<GscSearchInsightSyncResult>;
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
  createBacklogTasksFromAudit(
    input: CreateBacklogTasksFromAuditWithUser
  ): Promise<BacklogTasksFromAuditResult>;
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
  async getBillingCheckoutContext(input) {
    return getDevBillingCheckoutContext(input);
  },
  async getBillingPortalContext(input) {
    return getDevBillingPortalContext(input);
  },
  async applyBillingWebhookUpdate(input) {
    return applyDevBillingWebhookUpdate(input);
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
  async listSyncedContentUrlsForSite(userId, organizationId, siteId) {
    return listDevSyncedContentUrlsForSite(userId, organizationId, siteId);
  },
  async getGscConnectionOverviewForSite(userId, organizationId, siteId) {
    return getDevGscConnectionOverviewForSite(userId, organizationId, siteId);
  },
  async getGscConnectionSecretForSite(userId, organizationId, siteId) {
    return getDevGscConnectionSecretForSite(userId, organizationId, siteId);
  },
  async upsertGscConnection(input) {
    return upsertDevGscConnection(input);
  },
  async selectGscConnectionProperty(input) {
    return selectDevGscConnectionProperty(input);
  },
  async listGscDailyMetrics(userId, organizationId, siteId, propertyUrl) {
    return listDevGscDailyMetrics(userId, organizationId, siteId, propertyUrl);
  },
  async upsertGscDailyMetrics(input) {
    return upsertDevGscDailyMetrics(input);
  },
  async listGscSearchInsights(userId, organizationId, siteId, options) {
    return listDevGscSearchInsights(userId, organizationId, siteId, options);
  },
  async replaceGscSearchInsights(input) {
    return replaceDevGscSearchInsights(input);
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
  async createBacklogTasksFromAudit(input) {
    return createDevBacklogTasksFromAudit(input);
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
      const trialStartedAt = new Date();
      const trialEndsAt = calculateTrialEndsAt(trialStartedAt);
      const trialPlan = await tx.plan.upsert({
        where: {
          code: "TRIAL"
        },
        update: {
          name: "Trial",
          monthlyPrice: 0,
          limits: planLimits.TRIAL,
          isActive: true
        },
        create: {
          code: "TRIAL",
          name: "Trial",
          monthlyPrice: 0,
          limits: planLimits.TRIAL,
          isActive: true
        }
      });

      const trialSubscription = await tx.subscription.create({
        data: {
          organizationId: created.id,
          planId: trialPlan.id,
          status: "TRIALING",
          trialEndsAt,
          currentPeriodEnd: trialEndsAt,
          provider: null,
          providerId: null
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
      await tx.activityLog.create({
        data: {
          organizationId: created.id,
          userId: input.user.id,
          action: "billing.trial_started",
          entityType: "Subscription",
          entityId: trialSubscription.id,
          metadata: {
            planCode: trialPlan.code,
            trialEndsAt: trialEndsAt.toISOString()
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
    const billingContext = await getDbBillingLimitContext(parsed.organizationId);
    const featureGates = buildBillingFeatureGates({
      limits: billingContext.currentPlan.limits,
      sitesUsed: billingContext.sitesUsed,
      usersUsed: billingContext.usersUsed,
      disabledReason: billingContext.disabledReason,
      disabledCode: billingContext.disabledCode
    });

    assertBillingFeatureAvailable(featureGates, "sites");

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

        const limitNotification = buildBillingLimitNotification({
          gate: buildBillingFeatureGates({
            limits: billingContext.currentPlan.limits,
            sitesUsed: billingContext.sitesUsed + 1,
            usersUsed: billingContext.usersUsed
          }).find((gate) => gate.key === "sites")!,
          planName: billingContext.currentPlan.name
        });

        if (limitNotification) {
          await tx.notification.create({
            data: {
              organizationId: parsed.organizationId,
              ...limitNotification
            }
          });
        }

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
    const membership = await requireDbOrganizationAccess({
      userId,
      organizationId,
      permission: "billing:read"
    });

    const [dbPlans, subscription, sitesUsed, usersUsed] = await prisma.$transaction([
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
      }),
      prisma.site.count({
        where: {
          organizationId
        }
      }),
      prisma.organizationMember.count({
        where: {
          organizationId,
          status: {
            not: "CANCELED"
          }
        }
      })
    ]);

    const plans = sortBillingPlans(dbPlans.map(mapBillingPlan).filter(isBillingPlan));
    const visiblePlans = plans.length > 0 ? plans : buildFallbackBillingPlans();
    const subscriptionSummary = subscription ? mapBillingSubscription(subscription) : null;
    const currentPlan = subscriptionSummary?.plan ?? findBillingPlan(visiblePlans, "TRIAL");
    const trialExpiryGateBlock = getLocalTrialExpiryGateBlock(subscriptionSummary);

    return {
      plans: visiblePlans,
      currentPlan,
      subscription: subscriptionSummary,
      isFallbackTrial: !subscriptionSummary,
      featureGates: buildBillingFeatureGates({
        limits: currentPlan.limits,
        sitesUsed,
        usersUsed,
        ...(trialExpiryGateBlock ?? {})
      }),
      actions: buildBillingActions({
        plans: visiblePlans,
        currentPlanCode: currentPlan.code,
        subscription: subscriptionSummary,
        canManageBilling: hasPermission(membership.role, "billing:manage"),
        portalSessionAvailable: Boolean(
          subscription?.provider === "stripe" &&
          subscription.providerId &&
          isBillingPortalConfigured()
        )
      })
    };
  },

  async getBillingCheckoutContext(input) {
    await requireDbOrganizationAccess({
      userId: input.user.id,
      organizationId: input.organizationId,
      permission: "billing:manage"
    });

    const [organization, dbPlans, subscription] = await prisma.$transaction([
      prisma.organization.findUnique({
        where: {
          id: input.organizationId
        }
      }),
      prisma.plan.findMany({
        where: {
          isActive: true
        }
      }),
      prisma.subscription.findFirst({
        where: {
          organizationId: input.organizationId,
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

    if (!organization) {
      throw new Error("ORGANIZATION_NOT_FOUND");
    }

    const plans = sortBillingPlans(dbPlans.map(mapBillingPlan).filter(isBillingPlan));
    const visiblePlans = plans.length > 0 ? plans : buildFallbackBillingPlans();
    const subscriptionSummary = subscription ? mapBillingSubscription(subscription) : null;

    return buildBillingCheckoutContext({
      organizationId: organization.id,
      organizationName: organization.name,
      userEmail: input.user.email,
      plans: visiblePlans,
      subscription: subscriptionSummary,
      planCode: input.planCode
    });
  },

  async getBillingPortalContext(input) {
    await requireDbOrganizationAccess({
      userId: input.user.id,
      organizationId: input.organizationId,
      permission: "billing:manage"
    });

    const [organization, subscription] = await prisma.$transaction([
      prisma.organization.findUnique({
        where: {
          id: input.organizationId
        }
      }),
      prisma.subscription.findFirst({
        where: {
          organizationId: input.organizationId,
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

    if (!organization) {
      throw new Error("ORGANIZATION_NOT_FOUND");
    }

    if (!subscription) {
      throw new Error("BILLING_SUBSCRIPTION_NOT_FOUND");
    }

    if (subscription.provider !== "stripe") {
      throw new Error("BILLING_PROVIDER_NOT_CONFIGURED");
    }

    if (!subscription.providerId) {
      throw new Error("BILLING_PORTAL_CUSTOMER_NOT_CONFIGURED");
    }

    const subscriptionSummary = mapBillingSubscription(subscription);

    if (!subscriptionSummary) {
      throw new Error("BILLING_SUBSCRIPTION_NOT_FOUND");
    }

    return {
      organizationId: organization.id,
      organizationName: organization.name,
      userEmail: input.user.email,
      providerCustomerId: subscription.providerId,
      subscription: subscriptionSummary
    };
  },

  async applyBillingWebhookUpdate(input) {
    try {
      return await prisma.$transaction(async (tx) => {
        const [organization, plan] = await Promise.all([
          tx.organization.findUnique({
            where: {
              id: input.organizationId
            }
          }),
          tx.plan.findUnique({
            where: {
              code: input.planCode
            }
          })
        ]);

        if (!organization || !plan) {
          await tx.billingWebhookEvent.create({
            data: {
              provider: "stripe",
              eventId: input.eventId,
              eventType: input.eventType,
              action: "ignored",
              organizationId: organization?.id ?? null,
              planCode: input.planCode
            }
          });

          return {
            eventId: input.eventId,
            eventType: input.eventType,
            action: "ignored",
            organizationId: input.organizationId,
            planCode: input.planCode
          };
        }

        const existing = await tx.subscription.findFirst({
          where: {
            organizationId: input.organizationId,
            provider: "stripe",
            providerId: input.customerId
          },
          orderBy: {
            updatedAt: "desc"
          }
        });

        if (input.status === "CANCELED") {
          if (!existing) {
            await tx.billingWebhookEvent.create({
              data: {
                provider: "stripe",
                eventId: input.eventId,
                eventType: input.eventType,
                action: "ignored",
                organizationId: organization.id,
                planCode: input.planCode
              }
            });

            return {
              eventId: input.eventId,
              eventType: input.eventType,
              action: "ignored",
              organizationId: input.organizationId,
              planCode: input.planCode
            };
          }

          await tx.billingWebhookEvent.create({
            data: {
              provider: "stripe",
              eventId: input.eventId,
              eventType: input.eventType,
              action: "subscription_canceled",
              organizationId: organization.id,
              planCode: input.planCode
            }
          });

          await tx.subscription.update({
            where: {
              id: existing.id
            },
            data: {
              status: "CANCELED",
              currentPeriodEnd: input.currentPeriodEnd,
              planId: plan.id
            }
          });

          return {
            eventId: input.eventId,
            eventType: input.eventType,
            action: "subscription_canceled",
            organizationId: input.organizationId,
            planCode: input.planCode
          };
        }

        if (existing) {
          await tx.billingWebhookEvent.create({
            data: {
              provider: "stripe",
              eventId: input.eventId,
              eventType: input.eventType,
              action: "subscription_updated",
              organizationId: organization.id,
              planCode: input.planCode
            }
          });

          await tx.subscription.update({
            where: {
              id: existing.id
            },
            data: {
              status: input.status,
              planId: plan.id,
              currentPeriodEnd: input.currentPeriodEnd,
              provider: "stripe",
              providerId: input.customerId
            }
          });

          return {
            eventId: input.eventId,
            eventType: input.eventType,
            action: "subscription_updated",
            organizationId: input.organizationId,
            planCode: input.planCode
          };
        }

        await tx.billingWebhookEvent.create({
          data: {
            provider: "stripe",
            eventId: input.eventId,
            eventType: input.eventType,
            action: "subscription_created",
            organizationId: organization.id,
            planCode: input.planCode
          }
        });

        await tx.subscription.create({
          data: {
            organizationId: input.organizationId,
            planId: plan.id,
            status: input.status,
            currentPeriodEnd: input.currentPeriodEnd,
            provider: "stripe",
            providerId: input.customerId
          }
        });

        return {
          eventId: input.eventId,
          eventType: input.eventType,
          action: "subscription_created",
          organizationId: input.organizationId,
          planCode: input.planCode
        };
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return {
          eventId: input.eventId,
          eventType: input.eventType,
          action: "ignored",
          organizationId: input.organizationId,
          planCode: input.planCode
        };
      }

      throw error;
    }
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

  async listSyncedContentUrlsForSite(userId, organizationId, siteId) {
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

    const items = await prisma.syncedContentItem.findMany({
      where: {
        organizationId,
        siteId
      },
      select: {
        id: true,
        externalId: true,
        url: true,
        title: true
      },
      orderBy: {
        externalId: "asc"
      }
    });

    return items;
  },

  async getGscConnectionOverviewForSite(userId, organizationId, siteId) {
    const membership = await requireDbOrganizationAccess({
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

    const connections = await prisma.gscConnection.findMany({
      where: {
        siteId,
        disconnectedAt: null
      },
      orderBy: {
        updatedAt: "desc"
      }
    });
    const mappedConnections = connections.map(mapGscConnectionSummary);

    return {
      siteId,
      connections: mappedConnections,
      connected: mappedConnections.length > 0,
      oauthConfigured: isGscOAuthConfigured(),
      action: buildGscConnectAction({
        canManageIntegrations: hasPermission(membership.role, "integration:manage"),
        organizationId,
        siteId,
        propertyUrl: site.url
      })
    };
  },

  async upsertGscConnection(input) {
    await requireDbOrganizationAccess({
      userId: input.user.id,
      organizationId: input.organizationId,
      permission: "integration:manage"
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

    const connection = await prisma.gscConnection.upsert({
      where: {
        siteId_propertyUrl: {
          siteId: input.siteId,
          propertyUrl: input.propertyUrl
        }
      },
      update: {
        googleAccountEmail: input.googleAccountEmail,
        encryptedRefreshToken: input.encryptedRefreshToken,
        disconnectedAt: null
      },
      create: {
        siteId: input.siteId,
        googleAccountEmail: input.googleAccountEmail,
        propertyUrl: input.propertyUrl,
        encryptedRefreshToken: input.encryptedRefreshToken
      }
    });

    await prisma.activityLog.create({
      data: {
        organizationId: input.organizationId,
        userId: input.user.id,
        action: "gsc.connected",
        entityType: "GscConnection",
        entityId: connection.id,
        metadata: {
          siteId: input.siteId,
          propertyUrl: input.propertyUrl
        }
      }
    });

    return mapGscConnectionSummary(connection);
  },

  async selectGscConnectionProperty(input) {
    await requireDbOrganizationAccess({
      userId: input.user.id,
      organizationId: input.organizationId,
      permission: "integration:manage"
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

    const connection = await prisma.gscConnection.upsert({
      where: {
        siteId_propertyUrl: {
          siteId: input.siteId,
          propertyUrl: input.propertyUrl
        }
      },
      update: {
        googleAccountEmail: input.googleAccountEmail,
        encryptedRefreshToken: input.encryptedRefreshToken,
        disconnectedAt: null
      },
      create: {
        siteId: input.siteId,
        googleAccountEmail: input.googleAccountEmail,
        propertyUrl: input.propertyUrl,
        encryptedRefreshToken: input.encryptedRefreshToken
      }
    });

    await prisma.activityLog.create({
      data: {
        organizationId: input.organizationId,
        userId: input.user.id,
        action: "gsc.property_selected",
        entityType: "GscConnection",
        entityId: connection.id,
        metadata: {
          siteId: input.siteId,
          propertyUrl: input.propertyUrl
        }
      }
    });

    return mapGscConnectionSummary(connection);
  },

  async getGscConnectionSecretForSite(userId, organizationId, siteId) {
    await requireDbOrganizationAccess({
      userId,
      organizationId,
      permission: "integration:manage"
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

    const connection = await prisma.gscConnection.findFirst({
      where: {
        siteId,
        disconnectedAt: null
      },
      orderBy: {
        updatedAt: "desc"
      }
    });

    return connection ? mapGscConnectionSecret(connection) : null;
  },

  async listGscDailyMetrics(userId, organizationId, siteId, propertyUrl) {
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

    const metrics = await prisma.gscDailyMetric.findMany({
      where: {
        siteId,
        ...(propertyUrl ? { propertyUrl } : {})
      },
      orderBy: {
        date: "asc"
      }
    });

    return metrics.map(mapGscDailyMetric);
  },

  async upsertGscDailyMetrics(input) {
    await requireDbOrganizationAccess({
      userId: input.user.id,
      organizationId: input.organizationId,
      permission: "integration:manage"
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

    await prisma.$transaction(
      input.metrics.map((metric) =>
        prisma.gscDailyMetric.upsert({
          where: {
            siteId_propertyUrl_date: {
              siteId: input.siteId,
              propertyUrl: input.propertyUrl,
              date: dateOnlyToDate(metric.date)
            }
          },
          update: {
            clicks: metric.clicks,
            impressions: metric.impressions,
            ctr: metric.ctr,
            position: metric.position,
            syncedAt: new Date()
          },
          create: {
            siteId: input.siteId,
            propertyUrl: input.propertyUrl,
            date: dateOnlyToDate(metric.date),
            clicks: metric.clicks,
            impressions: metric.impressions,
            ctr: metric.ctr,
            position: metric.position
          }
        })
      )
    );

    await prisma.activityLog.create({
      data: {
        organizationId: input.organizationId,
        userId: input.user.id,
        action: "gsc.metrics_synced",
        entityType: "GscConnection",
        entityId: input.siteId,
        metadata: {
          siteId: input.siteId,
          propertyUrl: input.propertyUrl,
          startDate: input.startDate,
          endDate: input.endDate,
          syncedRows: input.metrics.length
        }
      }
    });

    const metrics = await prisma.gscDailyMetric.findMany({
      where: {
        siteId: input.siteId,
        propertyUrl: input.propertyUrl
      },
      orderBy: {
        date: "asc"
      }
    });

    return {
      siteId: input.siteId,
      propertyUrl: input.propertyUrl,
      startDate: input.startDate,
      endDate: input.endDate,
      syncedRows: input.metrics.length,
      metrics: metrics.map(mapGscDailyMetric)
    };
  },

  async listGscSearchInsights(userId, organizationId, siteId, options) {
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

    const requestedPropertyUrl = options?.propertyUrl;
    const latestInsight =
      options?.startDate && options.endDate
        ? null
        : await prisma.gscSearchInsight.findFirst({
            where: {
              siteId,
              ...(requestedPropertyUrl ? { propertyUrl: requestedPropertyUrl } : {})
            },
            orderBy: {
              syncedAt: "desc"
            }
          });
    const startDate = options?.startDate ?? latestInsight?.startDate.toISOString().slice(0, 10);
    const endDate = options?.endDate ?? latestInsight?.endDate.toISOString().slice(0, 10);
    const propertyUrl = requestedPropertyUrl ?? latestInsight?.propertyUrl;

    if (!startDate || !endDate || !propertyUrl) {
      return [];
    }

    const insights = await prisma.gscSearchInsight.findMany({
      where: {
        siteId,
        propertyUrl,
        startDate: dateOnlyToDate(startDate),
        endDate: dateOnlyToDate(endDate)
      },
      orderBy: [
        {
          clicks: "desc"
        },
        {
          impressions: "desc"
        }
      ],
      take: options?.limit
    });

    return insights.map(mapGscSearchInsight);
  },

  async replaceGscSearchInsights(input) {
    await requireDbOrganizationAccess({
      userId: input.user.id,
      organizationId: input.organizationId,
      permission: "integration:manage"
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

    const startDate = dateOnlyToDate(input.startDate);
    const endDate = dateOnlyToDate(input.endDate);
    const syncedAt = new Date();

    await prisma.$transaction([
      prisma.gscSearchInsight.deleteMany({
        where: {
          siteId: input.siteId,
          propertyUrl: input.propertyUrl,
          startDate,
          endDate
        }
      }),
      ...input.insights.map((insight) =>
        prisma.gscSearchInsight.create({
          data: {
            siteId: input.siteId,
            propertyUrl: input.propertyUrl,
            startDate,
            endDate,
            page: insight.page,
            query: insight.query,
            clicks: insight.clicks,
            impressions: insight.impressions,
            ctr: insight.ctr,
            position: insight.position,
            syncedAt
          }
        })
      )
    ]);

    await prisma.activityLog.create({
      data: {
        organizationId: input.organizationId,
        userId: input.user.id,
        action: "gsc.insights_synced",
        entityType: "GscConnection",
        entityId: input.siteId,
        metadata: {
          siteId: input.siteId,
          propertyUrl: input.propertyUrl,
          startDate: input.startDate,
          endDate: input.endDate,
          syncedRows: input.insights.length
        }
      }
    });

    const insights = await prisma.gscSearchInsight.findMany({
      where: {
        siteId: input.siteId,
        propertyUrl: input.propertyUrl,
        startDate,
        endDate
      },
      orderBy: [
        {
          clicks: "desc"
        },
        {
          impressions: "desc"
        }
      ]
    });

    return {
      siteId: input.siteId,
      propertyUrl: input.propertyUrl,
      startDate: input.startDate,
      endDate: input.endDate,
      syncedRows: input.insights.length,
      insights: insights.map(mapGscSearchInsight)
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
    const issueSummaries = await buildAuditIssueSummariesForAudits(audits.map((audit) => audit.id));

    return audits.map((audit) => mapAudit(audit, issueSummaries.get(audit.id)));
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

    const syncedContentItems = await prisma.syncedContentItem.findMany({
      where: {
        organizationId: input.organizationId,
        siteId: input.siteId
      },
      orderBy: [
        {
          lastSeenAt: "desc"
        },
        {
          id: "desc"
        }
      ],
      take: 500
    });
    const generatedIssues = syncedContentItems.flatMap((item) =>
      buildAuditIssueInputsFromSyncedContent(mapSyncedContentItem(item))
    );

    const auditResult = await prisma.$transaction(async (tx) => {
      const auditStartedAt = new Date();
      const created = await tx.audit.create({
        data: {
          organizationId: input.organizationId,
          siteId: input.siteId,
          status: "COMPLETED",
          startedAt: auditStartedAt,
          completedAt: auditStartedAt
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
            siteId: input.siteId,
            generatedIssueCount: generatedIssues.length,
            status: created.status
          }
        }
      });

      for (const issue of generatedIssues) {
        await tx.auditIssue.upsert({
          where: {
            organizationId_siteId_fingerprint: {
              organizationId: input.organizationId,
              siteId: input.siteId,
              fingerprint: issue.fingerprint
            }
          },
          update: {
            auditId: created.id,
            issueType: issue.issueType,
            severity: issue.severity,
            affectedUrl: issue.affectedUrl,
            evidence: toPrismaJson(issue.evidence),
            explanation: issue.explanation,
            recommendedAction: issue.recommendedAction,
            potentialImpact: issue.potentialImpact
          },
          create: {
            auditId: created.id,
            organizationId: input.organizationId,
            siteId: input.siteId,
            issueType: issue.issueType,
            severity: issue.severity,
            affectedUrl: issue.affectedUrl,
            evidence: toPrismaJson(issue.evidence),
            explanation: issue.explanation,
            recommendedAction: issue.recommendedAction,
            potentialImpact: issue.potentialImpact,
            fingerprint: issue.fingerprint
          }
        });
      }

      const persistedIssues = await tx.auditIssue.findMany({
        where: {
          auditId: created.id
        },
        select: {
          status: true,
          severity: true
        }
      });

      return {
        audit: created,
        issueSummary: summarizeAuditIssueRows(persistedIssues)
      };
    });

    return mapAudit(auditResult.audit, auditResult.issueSummary);
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

  async createBacklogTasksFromAudit(input) {
    const parsed = backlogTasksFromAuditSchema.parse(input);
    await requireDbOrganizationAccess({
      userId: input.user.id,
      organizationId: parsed.organizationId,
      permission: "backlog:update"
    });

    const audit = await prisma.audit.findFirst({
      where: {
        id: parsed.auditId,
        organizationId: parsed.organizationId,
        siteId: parsed.siteId
      }
    });

    if (!audit) {
      throw new Error("AUDIT_NOT_FOUND");
    }

    const issues = await prisma.auditIssue.findMany({
      where: {
        auditId: audit.id,
        organizationId: parsed.organizationId,
        siteId: parsed.siteId,
        status: parsed.status
      },
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
      take: 500
    });
    const issueIds = issues.map((issue) => issue.id);

    const taskResult = await prisma.$transaction(async (tx) => {
      const existingTasks =
        issueIds.length > 0
          ? await tx.backlogTask.findMany({
              where: {
                organizationId: parsed.organizationId,
                siteId: parsed.siteId,
                auditIssueId: {
                  in: issueIds
                }
              },
              orderBy: {
                createdAt: "asc"
              }
            })
          : [];
      const existingTaskByIssueId = new Map<string, (typeof existingTasks)[number]>();

      for (const task of existingTasks) {
        if (task.auditIssueId && !existingTaskByIssueId.has(task.auditIssueId)) {
          existingTaskByIssueId.set(task.auditIssueId, task);
        }
      }

      const issuesToCreate = issues.filter((issue) => !existingTaskByIssueId.has(issue.id));
      const createdTasks = await Promise.all(
        issuesToCreate.map((issue) =>
          tx.backlogTask.create({
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
          })
        )
      );
      const taskByIssueId = new Map(existingTaskByIssueId);

      for (const task of createdTasks) {
        if (task.auditIssueId) {
          taskByIssueId.set(task.auditIssueId, task);
        }
      }

      if (issues.length > 0) {
        await tx.activityLog.create({
          data: {
            organizationId: parsed.organizationId,
            userId: input.user.id,
            action: "backlog_task.bulk_created_from_audit",
            entityType: "Audit",
            entityId: audit.id,
            metadata: {
              siteId: parsed.siteId,
              auditId: audit.id,
              status: parsed.status,
              totalIssues: issues.length,
              createdCount: createdTasks.length,
              existingCount: existingTaskByIssueId.size
            }
          }
        });
      }

      return {
        createdCount: createdTasks.length,
        existingCount: existingTaskByIssueId.size,
        tasks: issues
          .map((issue) => taskByIssueId.get(issue.id))
          .filter((task): task is NonNullable<typeof task> => Boolean(task))
      };
    });

    return {
      organizationId: parsed.organizationId,
      siteId: parsed.siteId,
      auditId: audit.id,
      sourceStatus: parsed.status,
      totalIssues: issues.length,
      createdCount: taskResult.createdCount,
      existingCount: taskResult.existingCount,
      tasks: taskResult.tasks.map((task) => mapBacklogTask(task))
    };
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

    const operationIds = operations.map((operation) => operation.id);
    const lifecycleLogs =
      operationIds.length > 0
        ? await prisma.activityLog.findMany({
            where: {
              organizationId,
              entityType: "BulkOperation",
              entityId: {
                in: operationIds
              },
              action: {
                in: [
                  "bulk_operation.rollback_started",
                  "bulk_operation.rolled_back",
                  "bulk_operation.retry_started"
                ]
              }
            },
            select: {
              entityId: true,
              action: true,
              metadata: true
            },
            orderBy: {
              createdAt: "desc"
            }
          })
        : [];
    const rollbackOperationIds = new Set<string>();
    const retryModeByOperationId = new Map<string, BulkOperationRetryMode>();

    for (const log of lifecycleLogs) {
      if (typeof log.entityId !== "string") {
        continue;
      }

      if (
        log.action === "bulk_operation.rollback_started" ||
        log.action === "bulk_operation.rolled_back"
      ) {
        rollbackOperationIds.add(log.entityId);
        continue;
      }

      if (
        log.action === "bulk_operation.retry_started" &&
        !retryModeByOperationId.has(log.entityId)
      ) {
        const retryMode = readBulkOperationRetryModeFromMetadata(log.metadata);

        if (retryMode) {
          retryModeByOperationId.set(log.entityId, retryMode);
        }
      }
    }

    return operations.map((operation) =>
      mapBulkOperation(
        operation,
        inferBulkOperationRetryMode({
          status: operation.status,
          hasRollbackLifecycle: rollbackOperationIds.has(operation.id),
          latestRetryMode: retryModeByOperationId.get(operation.id),
          items: operation.items
        })
      )
    );
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

    const syncedContentItem = await prisma.syncedContentItem.findFirst({
      where: {
        organizationId: parsed.organizationId,
        siteId: parsed.siteId,
        url: task.url
      },
      orderBy: {
        lastSeenAt: "desc"
      }
    });
    const previewResult = buildSafeOperationPreview({
      task,
      syncedContentItem: syncedContentItem ? mapSyncedContentItem(syncedContentItem) : null
    });
    const operation = await prisma.$transaction(async (tx) => {
      const created = await tx.bulkOperation.create({
        data: {
          organizationId: parsed.organizationId,
          siteId: parsed.siteId,
          type: "BACKLOG_TASK_PREVIEW",
          status: "PREVIEWED",
          preview: toPrismaJson(previewResult.preview),
          items: {
            create: {
              externalId: previewResult.item.externalId,
              status: "PREVIEWED",
              beforeValue: toPrismaJson(previewResult.item.beforeValue),
              afterValue: toPrismaJson(previewResult.item.afterValue)
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
            itemCount: created.items.length,
            executable: previewResult.preview.executable,
            noMutation: previewResult.preview.noMutation
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

    try {
      await enqueueBulkOperationExecutionJob({
        organizationId: parsed.organizationId,
        siteId: parsed.siteId,
        operationId: operation.id
      });
    } catch (error) {
      const failedOperation = await markBulkOperationExecutionQueueFailure({
        organizationId: parsed.organizationId,
        siteId: parsed.siteId,
        operationId: operation.id,
        type: operation.type,
        itemCount: operation.items.length,
        message: "Could not enqueue bulk operation execution job."
      });

      if (failedOperation) {
        return mapBulkOperation(failedOperation, "rollback");
      }

      throw error;
    }

    return mapBulkOperation(operation, "rollback");
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
    const restorableItemIds = existing.items
      .filter((item) => item.status === "COMPLETED")
      .map((item) => item.id);

    if (restorableItemIds.length === 0) {
      throw new Error("BULK_OPERATION_NOT_RESTORABLE");
    }

    const operation = await prisma.$transaction(async (tx) => {
      await tx.bulkOperationItem.updateMany({
        where: {
          bulkOperationId: existing.id,
          id: {
            in: restorableItemIds
          }
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
          action: "bulk_operation.rollback_started",
          entityType: "BulkOperation",
          entityId: updated.id,
          metadata: {
            siteId: parsed.siteId,
            type: updated.type,
            previousStatus,
            itemCount: restorableItemIds.length,
            reason: parsed.reason ?? null,
            noMutation: false,
            trigger: "queue_enqueue"
          }
        }
      });

      return updated;
    });

    try {
      await enqueueBulkOperationRollbackJob({
        organizationId: parsed.organizationId,
        siteId: parsed.siteId,
        operationId: operation.id
      });
    } catch (error) {
      const failedOperation = await markBulkOperationExecutionQueueFailure({
        organizationId: parsed.organizationId,
        siteId: parsed.siteId,
        operationId: operation.id,
        type: operation.type,
        itemCount: restorableItemIds.length,
        message: "Could not enqueue bulk operation rollback job."
      });

      if (failedOperation) {
        return mapBulkOperation(failedOperation, "rollback");
      }

      throw error;
    }

    return mapBulkOperation(operation, "rollback");
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

    const rollbackAttempt = await prisma.activityLog.findFirst({
      where: {
        organizationId: parsed.organizationId,
        entityType: "BulkOperation",
        entityId: existing.id,
        action: {
          in: ["bulk_operation.rollback_started", "bulk_operation.rolled_back"]
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });
    const retryMode = rollbackAttempt ? "rollback" : "execute";

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
            retryMode,
            reason: parsed.reason ?? null,
            noMutation: false
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

    try {
      if (retryMode === "rollback") {
        await enqueueBulkOperationRollbackJob({
          organizationId: parsed.organizationId,
          siteId: parsed.siteId,
          operationId: operation.id
        });
      } else {
        await enqueueBulkOperationExecutionJob({
          organizationId: parsed.organizationId,
          siteId: parsed.siteId,
          operationId: operation.id
        });
      }
    } catch (error) {
      const failedOperation = await markBulkOperationExecutionQueueFailure({
        organizationId: parsed.organizationId,
        siteId: parsed.siteId,
        operationId: operation.id,
        type: operation.type,
        itemCount: failedItems.length,
        message: `Could not enqueue bulk operation ${retryMode} retry job.`
      });

      if (failedOperation) {
        return mapBulkOperation(failedOperation, retryMode);
      }

      throw error;
    }

    return mapBulkOperation(operation, retryMode);
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
      const existingUser = await prisma.user.findUnique({
        where: {
          email: parsed.email
        },
        select: {
          id: true
        }
      });
      const existingMember = existingUser
        ? await prisma.organizationMember.findFirst({
            where: {
              organizationId: parsed.organizationId,
              userId: existingUser.id
            }
          })
        : null;

      if (existingMember) {
        throw new Error("MEMBER_ALREADY_EXISTS");
      }

      const billingContext = await getDbBillingLimitContext(parsed.organizationId);
      const featureGates = buildBillingFeatureGates({
        limits: billingContext.currentPlan.limits,
        sitesUsed: billingContext.sitesUsed,
        usersUsed: billingContext.usersUsed,
        disabledReason: billingContext.disabledReason,
        disabledCode: billingContext.disabledCode
      });

      assertBillingFeatureAvailable(featureGates, "users");

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

        const limitNotification = buildBillingLimitNotification({
          gate: buildBillingFeatureGates({
            limits: billingContext.currentPlan.limits,
            sitesUsed: billingContext.sitesUsed,
            usersUsed: billingContext.usersUsed + 1
          }).find((gate) => gate.key === "users")!,
          planName: billingContext.currentPlan.name
        });

        if (limitNotification) {
          await tx.notification.create({
            data: {
              organizationId: parsed.organizationId,
              ...limitNotification
            }
          });
        }

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

function mapGscConnectionSummary(connection: {
  id: string;
  siteId: string;
  googleAccountEmail: string;
  propertyUrl: string;
  disconnectedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): GscConnectionSummary {
  return {
    id: connection.id,
    siteId: connection.siteId,
    googleAccountEmail: connection.googleAccountEmail,
    propertyUrl: connection.propertyUrl,
    connectedAt: connection.createdAt.toISOString(),
    updatedAt: connection.updatedAt.toISOString(),
    disconnectedAt: connection.disconnectedAt?.toISOString() ?? null
  };
}

function mapGscConnectionSecret(connection: {
  id: string;
  siteId: string;
  googleAccountEmail: string;
  propertyUrl: string;
  encryptedRefreshToken: string;
  disconnectedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): GscConnectionSecret {
  return {
    ...mapGscConnectionSummary(connection),
    encryptedRefreshToken: connection.encryptedRefreshToken
  };
}

function mapGscDailyMetric(metric: {
  id: string;
  siteId: string;
  propertyUrl: string;
  date: Date;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  syncedAt: Date;
}): GscDailyMetric {
  return {
    id: metric.id,
    siteId: metric.siteId,
    propertyUrl: metric.propertyUrl,
    date: metric.date.toISOString().slice(0, 10),
    clicks: metric.clicks,
    impressions: metric.impressions,
    ctr: metric.ctr,
    position: metric.position,
    syncedAt: metric.syncedAt.toISOString()
  };
}

function mapGscSearchInsight(insight: {
  id: string;
  siteId: string;
  propertyUrl: string;
  startDate: Date;
  endDate: Date;
  page: string;
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  syncedAt: Date;
}): GscSearchInsight {
  return {
    id: insight.id,
    siteId: insight.siteId,
    propertyUrl: insight.propertyUrl,
    startDate: insight.startDate.toISOString().slice(0, 10),
    endDate: insight.endDate.toISOString().slice(0, 10),
    page: insight.page,
    query: insight.query,
    clicks: insight.clicks,
    impressions: insight.impressions,
    ctr: insight.ctr,
    position: insight.position,
    syncedAt: insight.syncedAt.toISOString()
  };
}

function dateOnlyToDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
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

async function getDbBillingLimitContext(organizationId: string): Promise<{
  currentPlan: BillingPlan;
  sitesUsed: number;
  usersUsed: number;
  disabledReason?: string;
  disabledCode?: string;
}> {
  const [subscription, sitesUsed, usersUsed] = await prisma.$transaction([
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
    }),
    prisma.site.count({
      where: {
        organizationId
      }
    }),
    prisma.organizationMember.count({
      where: {
        organizationId,
        status: {
          not: "CANCELED"
        }
      }
    })
  ]);

  const subscriptionSummary = subscription ? mapBillingSubscription(subscription) : null;
  const trialExpiryGateBlock = getLocalTrialExpiryGateBlock(subscriptionSummary);

  return {
    currentPlan: subscriptionSummary?.plan ?? findBillingPlan([], "TRIAL"),
    sitesUsed,
    usersUsed,
    ...(trialExpiryGateBlock ?? {})
  };
}

function buildBillingCheckoutContext(input: {
  organizationId: string;
  organizationName: string;
  userEmail: string;
  plans: BillingPlan[];
  subscription: BillingSubscription | null;
  planCode: PlanCode;
}): BillingCheckoutContext {
  const currentPlan = input.subscription?.plan ?? findBillingPlan(input.plans, "TRIAL");
  const targetPlan = input.plans.find((plan) => plan.code === input.planCode && plan.isActive);

  if (!targetPlan) {
    throw new Error("BILLING_PLAN_NOT_FOUND");
  }

  if (targetPlan.code === currentPlan.code) {
    throw new Error("BILLING_CURRENT_PLAN_SELECTED");
  }

  if (targetPlan.code === "TRIAL") {
    throw new Error("BILLING_TRIAL_REQUIRES_INTERNAL_FLOW");
  }

  if (targetPlan.code === "ENTERPRISE") {
    throw new Error("BILLING_ENTERPRISE_REQUIRES_SALES");
  }

  return {
    organizationId: input.organizationId,
    organizationName: input.organizationName,
    userEmail: input.userEmail,
    currentPlan,
    targetPlan,
    subscription: input.subscription
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

  const normalized = normalizeLocalTrialStatus(subscription);

  return {
    id: subscription.id,
    organizationId: subscription.organizationId,
    status: normalized.status,
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
  metadata: Prisma.JsonValue | null;
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
    metadata: normalizeSyncedContentMetadata(item.metadata),
    firstSeenAt: item.firstSeenAt.toISOString(),
    lastSeenAt: item.lastSeenAt.toISOString()
  };
}

function normalizeSyncedContentMetadata(metadata: Prisma.JsonValue | null): SyncedContentMetadata {
  if (typeof metadata !== "object" || metadata === null || Array.isArray(metadata)) {
    return {};
  }

  return metadata as SyncedContentMetadata;
}

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

function mapAudit(
  audit: {
    id: string;
    organizationId: string;
    siteId: string;
    status: Audit["status"];
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
  },
  issueSummary: AuditIssueSummary = emptyAuditIssueSummary()
): Audit {
  return {
    id: audit.id,
    organizationId: audit.organizationId,
    siteId: audit.siteId,
    status: audit.status,
    startedAt: audit.startedAt?.toISOString() ?? null,
    completedAt: audit.completedAt?.toISOString() ?? null,
    createdAt: audit.createdAt.toISOString(),
    issueSummary
  };
}

async function buildAuditIssueSummariesForAudits(
  auditIds: string[]
): Promise<Map<string, AuditIssueSummary>> {
  if (auditIds.length === 0) {
    return new Map();
  }

  const issues = await prisma.auditIssue.findMany({
    where: {
      auditId: {
        in: auditIds
      }
    },
    select: {
      auditId: true,
      status: true,
      severity: true
    }
  });
  const grouped = new Map<
    string,
    Array<{ status: AuditIssue["status"]; severity: AuditIssue["severity"] }>
  >();

  for (const issue of issues) {
    const rows = grouped.get(issue.auditId) ?? [];
    rows.push(issue);
    grouped.set(issue.auditId, rows);
  }

  return new Map(
    auditIds.map((auditId) => [auditId, summarizeAuditIssueRows(grouped.get(auditId) ?? [])])
  );
}

function summarizeAuditIssueRows(
  issues: Array<{ status: AuditIssue["status"]; severity: AuditIssue["severity"] }>
): AuditIssueSummary {
  return issues.reduce<AuditIssueSummary>((summary, issue) => {
    summary.total += 1;

    if (issue.status === "OPEN") {
      summary.open += 1;
    }

    if (issue.status === "RESOLVED") {
      summary.resolved += 1;
    }

    if (issue.severity === "HIGH") {
      summary.high += 1;
    }

    if (issue.severity === "CRITICAL") {
      summary.critical += 1;
    }

    return summary;
  }, emptyAuditIssueSummary());
}

function emptyAuditIssueSummary(): AuditIssueSummary {
  return {
    total: 0,
    open: 0,
    resolved: 0,
    high: 0,
    critical: 0
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

function buildBulkOperationDryRunResult(operation: {
  id: string;
  type: string;
  items: Array<{
    id: string;
    externalId: string;
    status: string;
    afterValue: unknown;
  }>;
}): Prisma.InputJsonObject {
  return buildBulkOperationDryRunPreviewResult({
    operationId: operation.id,
    type: operation.type,
    itemCount: operation.items.length,
    executableItems: countExecutableSafeOperationItems(operation.items),
    checkedAt: new Date().toISOString()
  }) as Prisma.InputJsonObject;
}

async function markBulkOperationExecutionQueueFailure(input: {
  organizationId: string;
  siteId: string;
  operationId: string;
  type: string;
  itemCount: number;
  message: string;
}) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.bulkOperation.findFirst({
      where: {
        id: input.operationId,
        organizationId: input.organizationId,
        siteId: input.siteId
      },
      include: {
        items: true
      }
    });

    if (!existing || existing.status !== "RUNNING") {
      return null;
    }

    await tx.bulkOperationItem.updateMany({
      where: {
        bulkOperationId: existing.id,
        status: "RUNNING"
      },
      data: {
        status: "FAILED",
        error: input.message
      }
    });

    const updated = await tx.bulkOperation.update({
      where: {
        id: existing.id
      },
      data: {
        status: "FAILED"
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
        organizationId: input.organizationId,
        userId: null,
        action: "bulk_operation.failed",
        entityType: "BulkOperation",
        entityId: updated.id,
        metadata: {
          siteId: input.siteId,
          type: input.type,
          itemCount: input.itemCount,
          failedItemCount: input.itemCount,
          message: input.message,
          trigger: "queue_enqueue"
        }
      }
    });

    await tx.notification.create({
      data: {
        organizationId: input.organizationId,
        ...buildBulkOperationNotification({
          event: "failed",
          itemCount: input.itemCount,
          failedItemCount: input.itemCount,
          message: input.message
        })
      }
    });

    return updated;
  });
}

function mapBulkOperation(
  operation: {
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
  },
  retryMode?: BulkOperationRetryMode | null
): BulkOperation {
  const items = operation.items?.map(mapBulkOperationItem) ?? [];

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
    items,
    retryMode:
      retryMode ??
      inferBulkOperationRetryMode({
        status: operation.status,
        items
      }),
    itemStatusSummary: summarizeBulkOperationItemStatuses(items)
  };
}

function summarizeBulkOperationItemStatuses(
  items: Array<{
    status: string;
  }>
): BulkOperationItemStatusSummary {
  const summary: BulkOperationItemStatusSummary = {
    total: items.length,
    previewed: 0,
    dryRunPassed: 0,
    confirmed: 0,
    running: 0,
    completed: 0,
    failed: 0,
    rolledBack: 0,
    other: 0
  };

  for (const item of items) {
    switch (item.status) {
      case "PREVIEWED":
        summary.previewed += 1;
        break;
      case "DRY_RUN_PASSED":
        summary.dryRunPassed += 1;
        break;
      case "CONFIRMED":
        summary.confirmed += 1;
        break;
      case "RUNNING":
        summary.running += 1;
        break;
      case "COMPLETED":
        summary.completed += 1;
        break;
      case "FAILED":
        summary.failed += 1;
        break;
      case "ROLLED_BACK":
        summary.rolledBack += 1;
        break;
      default:
        summary.other += 1;
        break;
    }
  }

  return summary;
}

function inferBulkOperationRetryMode(input: {
  status: BulkOperation["status"];
  hasRollbackLifecycle?: boolean;
  latestRetryMode?: BulkOperationRetryMode | null;
  items?: Array<{
    status: string;
  }>;
}): BulkOperationRetryMode | null {
  const hasRollbackItem = input.items?.some((item) => item.status === "ROLLED_BACK") ?? false;

  if (input.hasRollbackLifecycle === true || hasRollbackItem) {
    return input.status === "FAILED" || input.status === "RUNNING" ? "rollback" : null;
  }

  if (input.latestRetryMode && (input.status === "FAILED" || input.status === "RUNNING")) {
    return input.latestRetryMode;
  }

  return input.status === "FAILED" ? "execute" : null;
}

function readBulkOperationRetryModeFromMetadata(metadata: unknown): BulkOperationRetryMode | null {
  if (typeof metadata !== "object" || metadata === null || Array.isArray(metadata)) {
    return null;
  }

  const retryMode = (metadata as Record<string, unknown>).retryMode;
  return retryMode === "execute" || retryMode === "rollback" ? retryMode : null;
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
