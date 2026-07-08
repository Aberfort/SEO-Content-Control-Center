import type { PlanCode, PlanLimits, Role } from "@sccc/shared";

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

export type Notification = {
  id: string;
  organizationId: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

export type NotificationListOptions = {
  read?: "read" | "unread";
  limit?: number;
};

export type NotificationBulkUpdateResult = {
  updatedCount: number;
};

export type BillingPlan = {
  id: string;
  code: PlanCode;
  name: string;
  monthlyPrice: number;
  limits: PlanLimits;
  isActive: boolean;
};

export type BillingSubscriptionStatus =
  "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "INCOMPLETE";

export type BillingSubscription = {
  id: string;
  organizationId: string;
  status: BillingSubscriptionStatus;
  plan: BillingPlan;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  provider: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BillingAction = {
  type: "checkout" | "billing_portal";
  label: string;
  enabled: boolean;
  provider: "none" | "stripe";
  targetPlanCode: PlanCode | null;
  disabledReason: string | null;
  requiresBillingManage: true;
  noMutation: boolean;
};

export type BillingFeatureGateKey = "sites" | "users";

export type BillingFeatureGate = {
  key: BillingFeatureGateKey;
  label: string;
  used: number;
  limit: number | "custom";
  remaining: number | "custom";
  allowed: boolean;
  disabledReason: string | null;
};

export type BillingOverview = {
  plans: BillingPlan[];
  currentPlan: BillingPlan;
  subscription: BillingSubscription | null;
  isFallbackTrial: boolean;
  featureGates: BillingFeatureGate[];
  actions: {
    checkout: BillingAction[];
    portal: BillingAction;
  };
};

export type BillingCheckoutContext = {
  organizationId: string;
  organizationName: string;
  userEmail: string;
  currentPlan: BillingPlan;
  targetPlan: BillingPlan;
  subscription: BillingSubscription | null;
};

export type BillingCheckoutSession = {
  provider: "stripe";
  targetPlanCode: PlanCode;
  sessionId: string;
  url: string;
};

export type BillingPortalContext = {
  organizationId: string;
  organizationName: string;
  userEmail: string;
  providerCustomerId: string;
  subscription: BillingSubscription;
};

export type BillingPortalSession = {
  provider: "stripe";
  sessionId: string;
  url: string;
};

export type AssistantRecommendationPriority = "low" | "medium" | "high";

export type AssistantRecommendationSource = {
  type: "backlog_task" | "synced_content";
  id: string;
  label: string;
  url: string | null;
  detail: string;
};

export type AssistantRecommendationAction = {
  type: "safe_preview";
  label: string;
  enabled: boolean;
  requiresManualConfirmation: true;
  targetTaskId: string | null;
  disabledReason: string | null;
};

export type AssistantRecommendation = {
  id: string;
  organizationId: string;
  siteId: string;
  title: string;
  rationale: string;
  nextStep: string;
  priority: AssistantRecommendationPriority;
  source: AssistantRecommendationSource;
  action: AssistantRecommendationAction;
  noMutation: true;
  safeguards: string[];
};

export type AssistantUsage = {
  metric: "ai_credits";
  periodStart: string;
  periodEnd: string;
  used: number;
  limit: number;
  remaining: number;
  limited: boolean;
  metered: false;
};

export type AssistantRecommendationList = {
  recommendations: AssistantRecommendation[];
  usage: AssistantUsage;
};

export type AssistantRecommendationListOptions = {
  limit?: number;
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
  metadata: SyncedContentMetadata;
  firstSeenAt: string;
  lastSeenAt: string;
};

export type SyncedContentMetadata = {
  authorId?: number | null;
  authorName?: string | null;
  publishedAt?: string | null;
  featuredImagePresent?: boolean;
  featuredImageId?: number | null;
  featuredImageUrl?: string | null;
  taxonomies?: Array<{
    taxonomy: string;
    terms: string[];
  }>;
  wordCount?: number | null;
  seoPlugin?: "yoast" | "rank_math" | "fallback";
  seoTitle?: string | null;
  metaDescription?: string | null;
  canonicalUrl?: string | null;
  robotsNoindex?: boolean | null;
  robotsNofollow?: boolean | null;
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
  activityLogs?: ActivityLog[];
};

export type BacklogTasksFromAuditResult = {
  organizationId: string;
  siteId: string;
  auditId: string;
  sourceStatus: AuditIssue["status"];
  totalIssues: number;
  createdCount: number;
  existingCount: number;
  tasks: BacklogTask[];
};

export type Audit = {
  id: string;
  organizationId: string;
  siteId: string;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  issueSummary: AuditIssueSummary;
};

export type AuditListOptions = {
  status?: Audit["status"];
  limit?: number;
};

export type AuditIssueSummary = {
  total: number;
  open: number;
  resolved: number;
  high: number;
  critical: number;
};

export type AuditIssue = {
  id: string;
  auditId: string;
  organizationId: string;
  siteId: string;
  issueType: string;
  status: "OPEN" | "IGNORED" | "RESOLVED" | "SNOOZED";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  affectedUrl: string;
  evidence: unknown;
  explanation: string;
  recommendedAction: string;
  potentialImpact: string | null;
  fingerprint: string;
  createdAt: string;
  updatedAt: string;
};

export type AuditIssueListOptions = {
  query?: string;
  status?: AuditIssue["status"];
  severity?: AuditIssue["severity"];
  limit?: number;
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
  query?: string;
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

export type BulkOperationStatus =
  | "DRAFT"
  | "PREVIEWED"
  | "DRY_RUN_PASSED"
  | "CONFIRMED"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "ROLLED_BACK";

export type BulkOperationItem = {
  id: string;
  bulkOperationId: string;
  externalId: string;
  status: string;
  beforeValue: unknown;
  afterValue: unknown;
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BulkOperation = {
  id: string;
  organizationId: string;
  siteId: string;
  type: string;
  status: BulkOperationStatus;
  preview: unknown;
  dryRunResult: unknown;
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: BulkOperationItem[];
};

export type BulkOperationListOptions = {
  status?: BulkOperationStatus;
  limit?: number;
};

export type OrganizationSummary = Organization & {
  role: Role;
  sites: Site[];
  activityLogs: ActivityLog[];
};
