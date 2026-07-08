import { z } from "zod";

import { planCodes } from "./plans";

export const organizationIdSchema = z.string().uuid();
export const siteIdSchema = z.string().uuid();
export const planCodeSchema = z.enum(planCodes);

export const tenantScopeSchema = z.object({
  organizationId: organizationIdSchema,
  siteId: siteIdSchema.optional()
});

export const siteCreateSchema = z.object({
  organizationId: organizationIdSchema,
  name: z.string().trim().min(2).max(120),
  url: z.string().url().max(2048)
});

export const organizationCreateSchema = z.object({
  name: z.string().trim().min(2).max(120)
});

export const organizationSlugSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const authEmailSchema = z.string().trim().email().max(254).toLowerCase();

export const passwordSchema = z.string().min(10).max(128);

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: authEmailSchema,
  password: passwordSchema
});

export const loginSchema = z.object({
  email: authEmailSchema,
  password: z.string().min(1).max(128)
});

export const assignableMemberRoleSchema = z.enum([
  "ADMIN",
  "SEO_MANAGER",
  "EDITOR",
  "WRITER",
  "VIEWER",
  "BILLING_MANAGER"
]);

export const inviteMemberSchema = z.object({
  organizationId: organizationIdSchema,
  email: authEmailSchema,
  role: assignableMemberRoleSchema
});

export const updateMemberRoleSchema = z.object({
  organizationId: organizationIdSchema,
  memberId: z.string().uuid(),
  role: assignableMemberRoleSchema
});

export const inviteTokenSchema = z.string().trim().min(32).max(256);

export const acceptInviteSchema = z.object({
  token: inviteTokenSchema
});

export const pluginConnectionChallengeCreateSchema = z.object({
  organizationId: organizationIdSchema,
  siteId: siteIdSchema
});

export const pluginConnectionChallengeSchema = z.string().trim().min(32).max(256);

export const pluginConnectionExchangeSchema = z.object({
  challenge: pluginConnectionChallengeSchema,
  endpoint: z.string().url().max(2048).optional()
});

export const pluginSyncTaxonomyMetadataSchema = z.object({
  taxonomy: z.string().trim().min(1).max(64),
  terms: z.array(z.string().trim().min(1).max(120)).max(100)
});

export const pluginSyncSeoPluginSchema = z.enum(["yoast", "rank_math", "fallback"]);

export const pluginSyncMetadataSchema = z
  .object({
    authorId: z.number().int().nonnegative().nullable().optional(),
    authorName: z.string().trim().max(255).nullable().optional(),
    publishedAt: z.string().datetime().nullable().optional(),
    featuredImagePresent: z.boolean().optional(),
    featuredImageId: z.number().int().nonnegative().nullable().optional(),
    featuredImageUrl: z.string().url().max(2048).nullable().optional(),
    taxonomies: z.array(pluginSyncTaxonomyMetadataSchema).max(32).optional(),
    wordCount: z.number().int().nonnegative().max(1_000_000).nullable().optional(),
    seoPlugin: pluginSyncSeoPluginSchema.optional(),
    seoTitle: z.string().trim().max(512).nullable().optional(),
    metaDescription: z.string().trim().max(1024).nullable().optional(),
    canonicalUrl: z.string().trim().url().max(2048).nullable().optional(),
    robotsNoindex: z.boolean().nullable().optional(),
    robotsNofollow: z.boolean().nullable().optional()
  })
  .strict();

export const pluginSyncItemSchema = z.object({
  externalId: z.string().min(1).max(191),
  type: z.enum(["post", "page", "custom_post_type", "taxonomy"]),
  url: z.string().url().max(2048),
  title: z.string().max(512).nullable(),
  status: z.string().max(64),
  modifiedAt: z.string().datetime(),
  metadata: pluginSyncMetadataSchema.default({})
});

export const pluginSyncBatchSchema = z.object({
  organizationId: organizationIdSchema,
  siteId: siteIdSchema,
  cursor: z.string().max(512).nullable(),
  items: z.array(pluginSyncItemSchema).max(250)
});

export const backlogTaskFromCandidateSchema = z.object({
  organizationId: organizationIdSchema,
  siteId: siteIdSchema,
  contentItemId: z.string().uuid(),
  candidateId: z.string().min(1).max(256)
});

export const backlogTaskFromAuditIssueSchema = z.object({
  organizationId: organizationIdSchema,
  siteId: siteIdSchema,
  auditIssueId: z.string().uuid()
});

export const auditIdSchema = z.string().uuid();

export const auditStatusSchema = z.enum(["QUEUED", "RUNNING", "COMPLETED", "FAILED"]);

export const auditListQuerySchema = z.object({
  status: auditStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional()
});

export const auditIssueStatusSchema = z.enum(["OPEN", "IGNORED", "RESOLVED", "SNOOZED"]);

export const auditIssueSeveritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

export const backlogTasksFromAuditSchema = z.object({
  organizationId: organizationIdSchema,
  siteId: siteIdSchema,
  auditId: auditIdSchema,
  status: auditIssueStatusSchema.default("OPEN")
});

export const auditIssueListQuerySchema = z.object({
  query: z.string().trim().max(160).optional(),
  status: auditIssueStatusSchema.optional(),
  severity: auditIssueSeveritySchema.optional(),
  limit: z.coerce.number().int().min(1).max(500).optional()
});

export const updateAuditIssueStatusSchema = z.object({
  organizationId: organizationIdSchema,
  siteId: siteIdSchema,
  auditId: auditIdSchema,
  issueId: z.string().uuid(),
  status: auditIssueStatusSchema
});

export const backlogTaskStatusSchema = z.enum([
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
  "SNOOZED",
  "IGNORED"
]);

export const backlogTaskSeveritySchema = auditIssueSeveritySchema;

export const backlogTaskListQuerySchema = z.object({
  query: z.string().trim().max(160).optional(),
  status: backlogTaskStatusSchema.optional(),
  severity: backlogTaskSeveritySchema.optional(),
  limit: z.coerce.number().int().min(1).max(500).optional()
});

export const updateBacklogTaskStatusSchema = z.object({
  organizationId: organizationIdSchema,
  siteId: siteIdSchema,
  taskId: z.string().uuid(),
  status: backlogTaskStatusSchema
});

export const updateBacklogTaskAssignmentSchema = z
  .object({
    organizationId: organizationIdSchema,
    siteId: siteIdSchema,
    taskId: z.string().uuid(),
    assigneeId: z.string().uuid().nullable().optional(),
    dueDate: z.string().date().nullable().optional()
  })
  .refine((input) => "assigneeId" in input || "dueDate" in input, {
    message: "At least one assignment field is required."
  });

export const backlogTaskCommentCreateSchema = z.object({
  organizationId: organizationIdSchema,
  siteId: siteIdSchema,
  taskId: z.string().uuid(),
  body: z.string().trim().min(1).max(2000)
});

export const bulkOperationStatusSchema = z.enum([
  "DRAFT",
  "PREVIEWED",
  "DRY_RUN_PASSED",
  "CONFIRMED",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "ROLLED_BACK"
]);

export const bulkOperationListQuerySchema = z.object({
  status: bulkOperationStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional()
});

export const bulkOperationPreviewCreateSchema = z.object({
  organizationId: organizationIdSchema,
  siteId: siteIdSchema,
  taskId: z.string().uuid()
});

export const bulkOperationDryRunSchema = z.object({
  organizationId: organizationIdSchema,
  siteId: siteIdSchema,
  operationId: z.string().uuid()
});

export const bulkOperationConfirmSchema = z.object({
  organizationId: organizationIdSchema,
  siteId: siteIdSchema,
  operationId: z.string().uuid(),
  confirmation: z.literal("CONFIRM")
});

export const bulkOperationStartSchema = z.object({
  organizationId: organizationIdSchema,
  siteId: siteIdSchema,
  operationId: z.string().uuid()
});

export const bulkOperationResultStatusSchema = z.enum(["COMPLETED", "FAILED"]);

export const bulkOperationResultItemSchema = z.object({
  itemId: z.string().uuid(),
  status: bulkOperationResultStatusSchema,
  error: z.string().trim().max(1000).nullable().optional()
});

export const bulkOperationResultSchema = z.object({
  organizationId: organizationIdSchema,
  siteId: siteIdSchema,
  operationId: z.string().uuid(),
  status: bulkOperationResultStatusSchema,
  message: z.string().trim().max(1000).nullable().optional(),
  itemResults: z.array(bulkOperationResultItemSchema).max(250).optional()
});

export const bulkOperationRollbackSchema = z.object({
  organizationId: organizationIdSchema,
  siteId: siteIdSchema,
  operationId: z.string().uuid(),
  reason: z.string().trim().max(1000).nullable().optional()
});

export const bulkOperationRetrySchema = z.object({
  organizationId: organizationIdSchema,
  siteId: siteIdSchema,
  operationId: z.string().uuid(),
  reason: z.string().trim().max(1000).nullable().optional()
});

export const notificationListQuerySchema = z.object({
  read: z.enum(["read", "unread"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional()
});

export const notificationReadStateSchema = z.object({
  read: z.boolean()
});

export const notificationMarkAllReadSchema = z.object({
  read: z.literal(true)
});

export const notificationReadUpdateSchema = z.object({
  organizationId: organizationIdSchema,
  notificationId: z.string().uuid(),
  read: z.boolean()
});

export const assistantRecommendationListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(25).optional()
});

export const billingCheckoutCreateSchema = z.object({
  planCode: planCodeSchema
});

export type TenantScope = z.infer<typeof tenantScopeSchema>;
export type OrganizationCreateInput = z.infer<typeof organizationCreateSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AssignableMemberRole = z.infer<typeof assignableMemberRoleSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
export type PluginConnectionChallengeCreateInput = z.infer<
  typeof pluginConnectionChallengeCreateSchema
>;
export type PluginConnectionExchangeInput = z.infer<typeof pluginConnectionExchangeSchema>;
export type SiteCreateInput = z.infer<typeof siteCreateSchema>;
export type PluginSyncBatch = z.infer<typeof pluginSyncBatchSchema>;
export type BacklogTaskFromCandidateInput = z.infer<typeof backlogTaskFromCandidateSchema>;
export type BacklogTaskFromAuditIssueInput = z.infer<typeof backlogTaskFromAuditIssueSchema>;
export type BacklogTasksFromAuditInput = z.infer<typeof backlogTasksFromAuditSchema>;
export type AuditListQuery = z.infer<typeof auditListQuerySchema>;
export type AuditIssueListQuery = z.infer<typeof auditIssueListQuerySchema>;
export type BacklogTaskListQuery = z.infer<typeof backlogTaskListQuerySchema>;
export type BacklogTaskCommentCreateInput = z.infer<typeof backlogTaskCommentCreateSchema>;
export type BulkOperationListQuery = z.infer<typeof bulkOperationListQuerySchema>;
export type BulkOperationPreviewCreateInput = z.infer<typeof bulkOperationPreviewCreateSchema>;
export type BulkOperationDryRunInput = z.infer<typeof bulkOperationDryRunSchema>;
export type BulkOperationConfirmInput = z.infer<typeof bulkOperationConfirmSchema>;
export type BulkOperationStartInput = z.infer<typeof bulkOperationStartSchema>;
export type BulkOperationResultInput = z.infer<typeof bulkOperationResultSchema>;
export type BulkOperationRollbackInput = z.infer<typeof bulkOperationRollbackSchema>;
export type BulkOperationRetryInput = z.infer<typeof bulkOperationRetrySchema>;
export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>;
export type NotificationMarkAllReadInput = z.infer<typeof notificationMarkAllReadSchema>;
export type NotificationReadStateInput = z.infer<typeof notificationReadStateSchema>;
export type NotificationReadUpdateInput = z.infer<typeof notificationReadUpdateSchema>;
export type AssistantRecommendationListQuery = z.infer<
  typeof assistantRecommendationListQuerySchema
>;
export type BillingCheckoutCreateInput = z.infer<typeof billingCheckoutCreateSchema>;
export type UpdateAuditIssueStatusInput = z.infer<typeof updateAuditIssueStatusSchema>;
export type UpdateBacklogTaskAssignmentInput = z.infer<typeof updateBacklogTaskAssignmentSchema>;
export type UpdateBacklogTaskStatusInput = z.infer<typeof updateBacklogTaskStatusSchema>;
