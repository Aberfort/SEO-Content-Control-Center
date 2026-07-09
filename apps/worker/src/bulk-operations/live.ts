import { decryptSecret, isTokenEncryptionConfigured } from "@sccc/gsc";
import { Prisma } from "@prisma/client";

import type { BulkOperationExecutionDeps, BulkOperationExecutionResultItem } from "./handlers";

async function getPrisma() {
  const { prisma } = await import("@sccc/database");
  return prisma;
}

export function isBulkOperationWorkerConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.DATABASE_URL?.trim() && isTokenEncryptionConfigured(env));
}

export function buildLiveBulkOperationExecutionDeps(): BulkOperationExecutionDeps {
  return {
    async loadOperation(organizationId, siteId, operationId) {
      const prisma = await getPrisma();
      const operation = await prisma.bulkOperation.findFirst({
        where: {
          id: operationId,
          organizationId,
          siteId
        },
        include: {
          site: {
            include: {
              wordpressConnection: true
            }
          },
          items: {
            orderBy: {
              createdAt: "asc"
            }
          }
        }
      });

      if (!operation) {
        return null;
      }

      return {
        id: operation.id,
        organizationId: operation.organizationId,
        siteId: operation.siteId,
        status: operation.status,
        siteUrl: operation.site.url,
        connection: operation.site.wordpressConnection
          ? {
              encryptedToken: operation.site.wordpressConnection.encryptedToken,
              disconnectedAt: operation.site.wordpressConnection.disconnectedAt
            }
          : null,
        items: operation.items.map((item) => ({
          id: item.id,
          externalId: item.externalId,
          status: item.status,
          beforeValue: item.beforeValue,
          afterValue: item.afterValue
        }))
      };
    },
    decryptSecret(value) {
      return decryptSecret(value);
    },
    async applyToWordPress(input) {
      const response = await fetch(new URL(input.path, input.siteUrl), {
        method: "POST",
        headers: input.headers,
        body: input.body
      });

      if (!response.ok) {
        throw new Error(`PLUGIN_APPLY_HTTP_${response.status}`);
      }

      return response.json();
    },
    recordResult(input) {
      return recordBulkOperationResult(input);
    }
  };
}

async function recordBulkOperationResult(input: {
  organizationId: string;
  siteId: string;
  operationId: string;
  status: "COMPLETED" | "FAILED";
  message: string | null;
  itemResults: BulkOperationExecutionResultItem[];
}): Promise<void> {
  const prisma = await getPrisma();
  const failedItemCount = input.itemResults.filter((item) => item.status === "FAILED").length;

  await prisma.$transaction(async (tx) => {
    const operation = await tx.bulkOperation.findFirst({
      where: {
        id: input.operationId,
        organizationId: input.organizationId,
        siteId: input.siteId
      },
      include: {
        items: true
      }
    });

    if (!operation) {
      throw new Error("BULK_OPERATION_NOT_FOUND");
    }

    if (operation.status !== "RUNNING") {
      throw new Error("BULK_OPERATION_NOT_RUNNING");
    }

    const operationItemIds = new Set(operation.items.map((item) => item.id));

    for (const item of input.itemResults) {
      if (!operationItemIds.has(item.itemId)) {
        throw new Error("BULK_OPERATION_ITEM_NOT_FOUND");
      }

      await tx.bulkOperationItem.update({
        where: {
          id: item.itemId
        },
        data: {
          status: item.status,
          beforeValue: toNullableJson(item.beforeValue),
          afterValue: toNullableJson(item.afterValue),
          error: item.status === "FAILED" ? (item.error ?? "Item failed.") : null
        }
      });
    }

    await tx.bulkOperation.update({
      where: {
        id: operation.id
      },
      data: {
        status: input.status
      }
    });

    await tx.activityLog.create({
      data: {
        organizationId: input.organizationId,
        userId: null,
        action: input.status === "COMPLETED" ? "bulk_operation.completed" : "bulk_operation.failed",
        entityType: "BulkOperation",
        entityId: operation.id,
        metadata: {
          siteId: input.siteId,
          type: operation.type,
          itemCount: operation.items.length,
          failedItemCount,
          message: input.message,
          trigger: "worker"
        }
      }
    });

    await tx.notification.create({
      data: {
        organizationId: input.organizationId,
        ...buildNotification({
          status: input.status,
          itemCount: operation.items.length,
          failedItemCount,
          message: input.message
        })
      }
    });
  });
}

function toNullableJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value === null || typeof value === "undefined") {
    return Prisma.JsonNull;
  }

  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function buildNotification(input: {
  status: "COMPLETED" | "FAILED";
  itemCount: number;
  failedItemCount: number;
  message: string | null;
}): { type: string; title: string; body: string } {
  if (input.status === "COMPLETED") {
    return {
      type: "bulk_operation.completed",
      title: "Safe operation completed",
      body: `Safe content operation completed for ${input.itemCount} item${pluralize(input.itemCount)}.`
    };
  }

  return {
    type: "bulk_operation.failed",
    title: "Safe operation failed",
    body: `Safe content operation failed for ${input.failedItemCount} of ${input.itemCount} item${pluralize(input.itemCount)}.${formatOptionalDetail(input.message)}`
  };
}

function pluralize(count: number): string {
  return count === 1 ? "" : "s";
}

function formatOptionalDetail(value: string | null): string {
  return value ? ` ${value}` : "";
}
