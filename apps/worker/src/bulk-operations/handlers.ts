import { bulkOperationExecuteJobDataSchema } from "@sccc/queue";
import { signPluginRequest } from "@sccc/shared";
import { z } from "zod";

import type { JobHandler } from "../job-handlers";

const applyPath = "/wp-json/sccc/v1/operations/apply";
const supportedApplyFields = [
  "seoPlugin",
  "seoTitle",
  "metaDescription",
  "canonicalUrl",
  "robotsNoindex",
  "robotsNofollow"
] as const;
const mutationApplyFields = [
  "seoTitle",
  "metaDescription",
  "canonicalUrl",
  "robotsNoindex",
  "robotsNofollow"
] as const;

const applyResultSchema = z.object({
  itemId: z.string().nullable(),
  externalId: z.string().nullable(),
  status: z.enum(["COMPLETED", "FAILED"]),
  beforeValue: z.unknown().nullable().optional(),
  afterValue: z.unknown().nullable().optional(),
  error: z.string().nullable().optional()
});

const applyResponseSchema = z.object({
  data: z.object({
    operationId: z.string(),
    siteId: z.string(),
    appliedCount: z.number().int().nonnegative(),
    failedCount: z.number().int().nonnegative(),
    results: z.array(applyResultSchema)
  })
});

export type BulkOperationExecutionItem = {
  id: string;
  externalId: string;
  status: string;
  beforeValue: unknown;
  afterValue: unknown;
};

export type BulkOperationExecutionConnection = {
  encryptedToken: string | null;
  disconnectedAt: Date | null;
};

export type BulkOperationExecutionRecord = {
  id: string;
  organizationId: string;
  siteId: string;
  status: string;
  siteUrl: string;
  connection: BulkOperationExecutionConnection | null;
  items: BulkOperationExecutionItem[];
};

export type BulkOperationExecutionResultItem = {
  itemId: string;
  externalId: string;
  status: "COMPLETED" | "FAILED";
  beforeValue: unknown;
  afterValue: unknown;
  error: string | null;
};

export type BulkOperationExecutionDeps = {
  loadOperation(
    organizationId: string,
    siteId: string,
    operationId: string
  ): Promise<BulkOperationExecutionRecord | null>;
  decryptSecret(value: string): string;
  applyToWordPress(input: {
    siteUrl: string;
    path: string;
    body: string;
    headers: Record<string, string>;
  }): Promise<unknown>;
  recordResult(input: {
    organizationId: string;
    siteId: string;
    operationId: string;
    status: "COMPLETED" | "FAILED";
    message: string | null;
    itemResults: BulkOperationExecutionResultItem[];
  }): Promise<void>;
  now?: () => Date;
};

type NormalizedApplyItem =
  | {
      executable: true;
      item: {
        itemId: string;
        externalId: string;
        afterValue: Record<string, unknown>;
      };
    }
  | {
      executable: false;
      result: BulkOperationExecutionResultItem;
    };

export function createBulkOperationExecuteHandler(deps: BulkOperationExecutionDeps): JobHandler {
  return async (job) => {
    const data = bulkOperationExecuteJobDataSchema.parse(job.data);
    const operation = await deps.loadOperation(data.organizationId, data.siteId, data.operationId);

    if (!operation) {
      throw new Error("BULK_OPERATION_NOT_FOUND");
    }

    if (operation.status !== "RUNNING") {
      throw new Error("BULK_OPERATION_NOT_RUNNING");
    }

    const runningItems = operation.items.filter((item) => item.status === "RUNNING");

    if (runningItems.length === 0) {
      throw new Error("BULK_OPERATION_NO_RUNNING_ITEMS");
    }

    if (!operation.connection || operation.connection.disconnectedAt) {
      const itemResults = failItems(runningItems, "wordpress_connection_not_available");
      await deps.recordResult({
        organizationId: data.organizationId,
        siteId: data.siteId,
        operationId: data.operationId,
        status: "FAILED",
        message: "WordPress connection is not available for safe operation execution.",
        itemResults
      });

      return buildSummary(false, itemResults);
    }

    if (!operation.connection.encryptedToken) {
      const itemResults = failItems(runningItems, "plugin_apply_secret_not_available");
      await deps.recordResult({
        organizationId: data.organizationId,
        siteId: data.siteId,
        operationId: data.operationId,
        status: "FAILED",
        message: "Plugin apply secret is unavailable. Reconnect the WordPress plugin.",
        itemResults
      });

      return buildSummary(false, itemResults);
    }

    const normalizedItems = runningItems.map(normalizeApplyItem);
    const localFailures = normalizedItems
      .filter(
        (item): item is Extract<NormalizedApplyItem, { executable: false }> => !item.executable
      )
      .map((item) => item.result);
    const executableItems = normalizedItems
      .filter((item): item is Extract<NormalizedApplyItem, { executable: true }> => item.executable)
      .map((item) => item.item);

    if (executableItems.length === 0) {
      await deps.recordResult({
        organizationId: data.organizationId,
        siteId: data.siteId,
        operationId: data.operationId,
        status: "FAILED",
        message: "Safe operation has no executable WordPress apply items.",
        itemResults: localFailures
      });

      return buildSummary(false, localFailures);
    }

    const token = deps.decryptSecret(operation.connection.encryptedToken);
    const body = JSON.stringify({
      organizationId: data.organizationId,
      siteId: data.siteId,
      operationId: data.operationId,
      items: executableItems
    });
    const timestamp = Math.floor((deps.now?.() ?? new Date()).getTime() / 1000);
    const headers = {
      "Content-Type": "application/json",
      "X-SCCC-Site-Id": data.siteId,
      "X-SCCC-Timestamp": String(timestamp),
      "X-SCCC-Signature": signPluginRequest({
        method: "POST",
        path: applyPath,
        timestamp,
        body,
        secret: token
      }),
      "X-SCCC-Token": token
    };

    let pluginResults: BulkOperationExecutionResultItem[];

    try {
      const response = applyResponseSchema.parse(
        await deps.applyToWordPress({
          siteUrl: operation.siteUrl,
          path: applyPath,
          body,
          headers
        })
      );

      if (response.data.operationId !== data.operationId || response.data.siteId !== data.siteId) {
        throw new Error("PLUGIN_APPLY_SCOPE_MISMATCH");
      }

      pluginResults = normalizePluginResults(executableItems, response.data.results);
    } catch (error) {
      pluginResults = executableItems.map((item) => ({
        itemId: item.itemId,
        externalId: item.externalId,
        status: "FAILED",
        beforeValue: null,
        afterValue: null,
        error: toBoundedError(error, "plugin_apply_request_failed")
      }));
    }

    const itemResults = [...localFailures, ...pluginResults];
    const failedCount = itemResults.filter((item) => item.status === "FAILED").length;
    const status = failedCount > 0 ? "FAILED" : "COMPLETED";

    await deps.recordResult({
      organizationId: data.organizationId,
      siteId: data.siteId,
      operationId: data.operationId,
      status,
      message:
        status === "COMPLETED"
          ? "Worker applied safe operation items through the WordPress plugin."
          : "Worker finished safe operation execution with one or more failed items.",
      itemResults
    });

    return buildSummary(true, itemResults);
  };
}

function normalizeApplyItem(item: BulkOperationExecutionItem): NormalizedApplyItem {
  if (!/^([A-Za-z0-9_-]+):([1-9][0-9]*)$/.test(item.externalId)) {
    return {
      executable: false,
      result: failedResult(item, "invalid_external_id")
    };
  }

  if (!isRecord(item.afterValue)) {
    return {
      executable: false,
      result: failedResult(item, "after_value_required")
    };
  }

  const keys = Object.keys(item.afterValue);
  const unknownFields = keys.filter(
    (key) => !supportedApplyFields.includes(key as (typeof supportedApplyFields)[number])
  );

  if (unknownFields.length > 0) {
    return {
      executable: false,
      result: failedResult(item, `unsupported_field:${unknownFields.join(",")}`)
    };
  }

  if (
    !keys.some((key) => mutationApplyFields.includes(key as (typeof mutationApplyFields)[number]))
  ) {
    return {
      executable: false,
      result: failedResult(item, "operation_item_not_executable")
    };
  }

  return {
    executable: true,
    item: {
      itemId: item.id,
      externalId: item.externalId,
      afterValue: item.afterValue
    }
  };
}

function normalizePluginResults(
  requestedItems: Array<{ itemId: string; externalId: string }>,
  rawResults: Array<z.infer<typeof applyResultSchema>>
): BulkOperationExecutionResultItem[] {
  const resultByItemId = new Map(rawResults.map((result) => [result.itemId, result]));

  return requestedItems.map((item) => {
    const result = resultByItemId.get(item.itemId);

    if (!result || result.externalId !== item.externalId) {
      return {
        itemId: item.itemId,
        externalId: item.externalId,
        status: "FAILED",
        beforeValue: null,
        afterValue: null,
        error: "plugin_result_missing"
      };
    }

    return {
      itemId: item.itemId,
      externalId: item.externalId,
      status: result.status,
      beforeValue: result.beforeValue ?? null,
      afterValue: result.afterValue ?? null,
      error: result.status === "FAILED" ? (result.error ?? "plugin_apply_failed") : null
    };
  });
}

function failItems(
  items: BulkOperationExecutionItem[],
  error: string
): BulkOperationExecutionResultItem[] {
  return items.map((item) => failedResult(item, error));
}

function failedResult(
  item: Pick<BulkOperationExecutionItem, "id" | "externalId" | "beforeValue" | "afterValue">,
  error: string
): BulkOperationExecutionResultItem {
  return {
    itemId: item.id,
    externalId: item.externalId,
    status: "FAILED",
    beforeValue: item.beforeValue ?? null,
    afterValue: item.afterValue ?? null,
    error
  };
}

function buildSummary(pluginCalled: boolean, itemResults: BulkOperationExecutionResultItem[]) {
  const failedItems = itemResults.filter((item) => item.status === "FAILED").length;

  return {
    pluginCalled,
    itemCount: itemResults.length,
    appliedItems: itemResults.length - failedItems,
    failedItems
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toBoundedError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : String(error || "");
  const normalized = message.trim() || fallback;

  return normalized.length > 500 ? normalized.slice(0, 500) : normalized;
}
