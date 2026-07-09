import type { BacklogTask, SyncedContentItem, SyncedContentMetadata } from "./types";

type SafeOperationTask = Pick<
  BacklogTask,
  | "id"
  | "organizationId"
  | "siteId"
  | "title"
  | "url"
  | "issueType"
  | "status"
  | "severity"
  | "potentialImpact"
  | "effortEstimate"
> & {
  createdAt: string | Date;
  updatedAt: string | Date;
};

type JsonRecord = Record<string, string | number | boolean | null | string[]>;

type ExecutableSeoPlugin = Extract<
  NonNullable<SyncedContentMetadata["seoPlugin"]>,
  "yoast" | "rank_math"
>;

type SupportedSeoMutation = "seoTitle" | "metaDescription";

export type SafeOperationPreviewPayload = {
  noMutation: boolean;
  executable: boolean;
  summary: string;
  taskId: string;
  contentExternalId?: string;
  executionDisabledReason?: string;
  beforeValue: JsonRecord;
  afterValue: JsonRecord;
  safeguards: string[];
};

export type SafeOperationPreviewItemPayload = {
  externalId: string;
  beforeValue: JsonRecord;
  afterValue: JsonRecord;
};

export type SafeOperationPreviewBuildResult = {
  preview: SafeOperationPreviewPayload;
  item: SafeOperationPreviewItemPayload;
};

const seoTitleIssueTypes = new Set([
  "missing_meta_title",
  "meta_title_missing",
  "synced_content.seo-title-missing",
  "audit.synced_content.seo-title-missing"
]);

const metaDescriptionIssueTypes = new Set([
  "missing_meta_description",
  "meta_description_missing",
  "synced_content.meta-description-missing",
  "audit.synced_content.meta-description-missing"
]);

const executableSafeguards = [
  "preview_only",
  "dry_run_required",
  "confirmation_required",
  "worker_execution_required",
  "signed_wordpress_apply",
  "bounded_seo_metadata"
];

const previewOnlySafeguards = [
  "preview_only",
  "no_wordpress_write",
  "dry_run_required",
  "confirmation_required"
];

export function buildSafeOperationPreview(input: {
  task: SafeOperationTask;
  syncedContentItem?: SyncedContentItem | null;
}): SafeOperationPreviewBuildResult {
  const mutation = classifyIssueMutation(input.task.issueType);
  const disabledReason = getExecutionDisabledReason(input.task, input.syncedContentItem, mutation);

  if (disabledReason || !mutation || !input.syncedContentItem) {
    return buildPreviewOnlyOperation(input.task, disabledReason ?? "unsupported_issue_type");
  }

  const syncedContentItem = input.syncedContentItem;
  const seoPlugin = syncedContentItem.metadata.seoPlugin as ExecutableSeoPlugin;
  const beforeValue = buildSyncedContentBeforeValue(input.task, syncedContentItem, seoPlugin);
  const afterValue = buildExecutableAfterValue(mutation, seoPlugin, syncedContentItem, input.task);

  return {
    preview: {
      noMutation: false,
      executable: true,
      summary: `Prepare a signed WordPress SEO metadata update for ${syncedContentItem.url}.`,
      taskId: input.task.id,
      contentExternalId: syncedContentItem.externalId,
      beforeValue,
      afterValue,
      safeguards: executableSafeguards
    },
    item: {
      externalId: syncedContentItem.externalId,
      beforeValue,
      afterValue
    }
  };
}

export function buildBulkOperationDryRunPreviewResult(input: {
  operationId: string;
  type: string;
  itemCount: number;
  executableItems: number;
  checkedAt: string;
}): JsonRecord {
  const executable = input.executableItems > 0;

  return {
    noMutation: !executable,
    operationId: input.operationId,
    type: input.type,
    status: "passed",
    checkedAt: input.checkedAt,
    itemCount: input.itemCount,
    passedItems: input.itemCount,
    failedItems: 0,
    executableItems: input.executableItems,
    checks: executable
      ? [
          "tenant_scope_valid",
          "preview_payload_present",
          "plugin_apply_payload_present",
          "wordpress_write_deferred",
          "confirmation_still_required"
        ]
      : [
          "tenant_scope_valid",
          "preview_payload_present",
          "wordpress_write_skipped",
          "confirmation_still_required"
        ],
    nextRequiredStep: "confirmation"
  };
}

export function countExecutableSafeOperationItems(
  items: Array<{ externalId: string; afterValue: unknown }>
): number {
  return items.filter((item) => isExecutableSafeOperationItem(item.externalId, item.afterValue))
    .length;
}

function buildPreviewOnlyOperation(
  task: SafeOperationTask,
  disabledReason: string
): SafeOperationPreviewBuildResult {
  const beforeValue = buildTaskBeforeValue(task);
  const afterValue = {
    recommendedAction: task.title,
    expectedWorkflow: "manual_review_then_dry_run",
    nextRequiredStep: "dry_run",
    noMutation: true
  };

  return {
    preview: {
      noMutation: true,
      executable: false,
      summary: `Preview recommended SEO work for ${task.url}.`,
      taskId: task.id,
      executionDisabledReason: disabledReason,
      beforeValue,
      afterValue,
      safeguards: previewOnlySafeguards
    },
    item: {
      externalId: task.url,
      beforeValue,
      afterValue
    }
  };
}

function getExecutionDisabledReason(
  task: SafeOperationTask,
  syncedContentItem: SyncedContentItem | null | undefined,
  mutation: SupportedSeoMutation | null
): string | null {
  if (!mutation) {
    return "unsupported_issue_type";
  }

  if (!syncedContentItem) {
    return "synced_content_item_not_found";
  }

  if (
    syncedContentItem.organizationId !== task.organizationId ||
    syncedContentItem.siteId !== task.siteId
  ) {
    return "synced_content_scope_mismatch";
  }

  if (syncedContentItem.url !== task.url) {
    return "synced_content_url_mismatch";
  }

  if (!isPostExternalId(syncedContentItem.externalId)) {
    return "invalid_synced_content_external_id";
  }

  if (!isExecutableSeoPlugin(syncedContentItem.metadata.seoPlugin)) {
    return "unsupported_seo_plugin";
  }

  if (mutation === "seoTitle" && hasTextValue(syncedContentItem.metadata.seoTitle)) {
    return "synced_content_seo_title_already_present";
  }

  if (mutation === "metaDescription" && hasTextValue(syncedContentItem.metadata.metaDescription)) {
    return "synced_content_meta_description_already_present";
  }

  return null;
}

function buildTaskBeforeValue(task: SafeOperationTask): JsonRecord {
  return {
    url: task.url,
    issueType: task.issueType,
    status: task.status,
    severity: task.severity,
    potentialImpact: task.potentialImpact,
    effortEstimate: task.effortEstimate,
    createdAt: toIsoString(task.createdAt),
    updatedAt: toIsoString(task.updatedAt)
  };
}

function buildSyncedContentBeforeValue(
  task: SafeOperationTask,
  syncedContentItem: SyncedContentItem,
  seoPlugin: ExecutableSeoPlugin
): JsonRecord {
  return {
    url: syncedContentItem.url,
    externalId: syncedContentItem.externalId,
    title: syncedContentItem.title,
    issueType: task.issueType,
    status: task.status,
    severity: task.severity,
    seoPlugin,
    seoTitle: syncedContentItem.metadata.seoTitle ?? null,
    metaDescription: syncedContentItem.metadata.metaDescription ?? null,
    canonicalUrl: syncedContentItem.metadata.canonicalUrl ?? null,
    robotsNoindex: syncedContentItem.metadata.robotsNoindex ?? null,
    robotsNofollow: syncedContentItem.metadata.robotsNofollow ?? null,
    modifiedAt: syncedContentItem.modifiedAt,
    lastSeenAt: syncedContentItem.lastSeenAt
  };
}

function buildExecutableAfterValue(
  mutation: SupportedSeoMutation,
  seoPlugin: ExecutableSeoPlugin,
  syncedContentItem: SyncedContentItem,
  task: SafeOperationTask
): JsonRecord {
  if (mutation === "seoTitle") {
    return {
      seoPlugin,
      seoTitle: buildSeoTitleDraft(syncedContentItem, task)
    };
  }

  return {
    seoPlugin,
    metaDescription: buildMetaDescriptionDraft(syncedContentItem, task)
  };
}

function classifyIssueMutation(issueType: string): SupportedSeoMutation | null {
  if (seoTitleIssueTypes.has(issueType)) {
    return "seoTitle";
  }

  if (metaDescriptionIssueTypes.has(issueType)) {
    return "metaDescription";
  }

  return null;
}

function buildSeoTitleDraft(syncedContentItem: SyncedContentItem, task: SafeOperationTask): string {
  return truncateAtWord(buildContentLabel(syncedContentItem, task), 60);
}

function buildMetaDescriptionDraft(
  syncedContentItem: SyncedContentItem,
  task: SafeOperationTask
): string {
  const label = truncateAtWord(buildContentLabel(syncedContentItem, task), 92);
  return truncateAtWord(
    `Review ${label} for practical guidance, key details, and next steps.`,
    155
  );
}

function buildContentLabel(syncedContentItem: SyncedContentItem, task: SafeOperationTask): string {
  return (
    normalizeText(syncedContentItem.title) ??
    normalizeText(readUrlPathLabel(syncedContentItem.url)) ??
    normalizeText(readUrlHostname(syncedContentItem.url)) ??
    normalizeText(task.title) ??
    "SEO content"
  );
}

function readUrlPathLabel(url: string): string | null {
  try {
    const parsed = new URL(url);
    const segment = parsed.pathname.split("/").filter(Boolean).at(-1);

    if (!segment) {
      return null;
    }

    return decodeURIComponent(segment).replaceAll("-", " ").replaceAll("_", " ");
  } catch {
    return null;
  }
}

function readUrlHostname(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function normalizeText(value: string | null | undefined): string | null {
  const normalized = value?.replace(/\s+/g, " ").trim();
  return normalized ? normalized : null;
}

function truncateAtWord(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  const sliced = value.slice(0, maxLength).trimEnd();
  const lastSpace = sliced.lastIndexOf(" ");
  const candidate = lastSpace >= Math.floor(maxLength * 0.6) ? sliced.slice(0, lastSpace) : sliced;

  return candidate.replace(/[.,;:!?-]+$/g, "").trimEnd();
}

function toIsoString(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value;
}

function hasTextValue(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function isExecutableSeoPlugin(value: unknown): value is ExecutableSeoPlugin {
  return value === "yoast" || value === "rank_math";
}

function isPostExternalId(value: string): boolean {
  return /^([A-Za-z0-9_-]+):([1-9][0-9]*)$/.test(value);
}

function isExecutableSafeOperationItem(externalId: string, afterValue: unknown): boolean {
  if (!isPostExternalId(externalId) || !isRecord(afterValue)) {
    return false;
  }

  const keys = Object.keys(afterValue);
  const supportedFields = [
    "seoPlugin",
    "seoTitle",
    "metaDescription",
    "canonicalUrl",
    "robotsNoindex",
    "robotsNofollow"
  ];
  const mutationFields = [
    "seoTitle",
    "metaDescription",
    "canonicalUrl",
    "robotsNoindex",
    "robotsNofollow"
  ];

  return (
    keys.length > 0 &&
    keys.every((key) => supportedFields.includes(key)) &&
    keys.some((key) => mutationFields.includes(key))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
