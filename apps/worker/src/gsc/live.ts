import {
  dateOnlyToDate,
  decryptSecret,
  isGscClientConfigured,
  isTokenEncryptionConfigured,
  queryGscDailyMetrics,
  queryGscSearchInsights,
  refreshGscAccessToken
} from "@sccc/gsc";
import { canUseEntitlement, planCodes, resolveCommercialAccess } from "@sccc/shared";

import type { GscScheduleDeps, GscSyncDeps } from "./handlers";
import type { GscSyncConnection } from "./plan";

/**
 * The Prisma client is imported lazily so importing this module never
 * requires a generated Prisma client (for example in unit tests).
 */
async function getPrisma() {
  const { prisma } = await import("@sccc/database");
  return prisma;
}

export function isGscWorkerConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(
    env.DATABASE_URL?.trim() && isTokenEncryptionConfigured(env) && isGscClientConfigured(env)
  );
}

export function buildLiveGscSyncDeps(): GscSyncDeps {
  return {
    async loadConnection(organizationId, siteId) {
      const prisma = await getPrisma();
      if (!(await organizationCanUseGsc(prisma, organizationId))) return null;
      const connection = await prisma.gscConnection.findFirst({
        where: {
          siteId,
          disconnectedAt: null,
          site: {
            organizationId
          }
        },
        orderBy: {
          updatedAt: "desc"
        }
      });

      if (!connection) {
        return null;
      }

      return {
        propertyUrl: connection.propertyUrl,
        encryptedRefreshToken: connection.encryptedRefreshToken
      };
    },
    decryptSecret(value) {
      return decryptSecret(value);
    },
    refreshAccessToken(refreshToken) {
      return refreshGscAccessToken({ refreshToken });
    },
    queryDailyMetrics(input) {
      return queryGscDailyMetrics(input);
    },
    async saveDailyMetrics(input) {
      const prisma = await getPrisma();
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

      await recordSyncActivity({
        organizationId: input.organizationId,
        siteId: input.siteId,
        propertyUrl: input.propertyUrl,
        action: "gsc.metrics_synced",
        startDate: input.startDate,
        endDate: input.endDate,
        syncedRows: input.metrics.length
      });
    },
    queryInsights(input) {
      return queryGscSearchInsights(input);
    },
    async replaceInsights(input) {
      const prisma = await getPrisma();
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
        prisma.gscSearchInsight.createMany({
          data: input.insights.map((insight) => ({
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
          }))
        })
      ]);

      await recordSyncActivity({
        organizationId: input.organizationId,
        siteId: input.siteId,
        propertyUrl: input.propertyUrl,
        action: "gsc.insights_synced",
        startDate: input.startDate,
        endDate: input.endDate,
        syncedRows: input.insights.length
      });
    }
  };
}

export function buildLiveGscScheduleDeps(enqueue: GscScheduleDeps["enqueue"]): GscScheduleDeps {
  return {
    async listActiveConnections(): Promise<GscSyncConnection[]> {
      const prisma = await getPrisma();
      const connections = await prisma.gscConnection.findMany({
        where: {
          disconnectedAt: null
        },
        select: {
          siteId: true,
          site: {
            select: {
              organizationId: true
            }
          }
        }
      });

      const allowedOrganizationIds = new Set<string>();
      for (const organizationId of new Set(
        connections.map((connection) => connection.site.organizationId)
      )) {
        if (await organizationCanUseGsc(prisma, organizationId)) {
          allowedOrganizationIds.add(organizationId);
        }
      }

      return connections
        .filter((connection) => allowedOrganizationIds.has(connection.site.organizationId))
        .map((connection: { siteId: string; site: { organizationId: string } }) => ({
          organizationId: connection.site.organizationId,
          siteId: connection.siteId
        }));
    },
    enqueue
  };
}

async function organizationCanUseGsc(
  prisma: Awaited<ReturnType<typeof getPrisma>>,
  organizationId: string
): Promise<boolean> {
  const subscription = await prisma.subscription.findFirst({
    where: {
      organizationId,
      status: { in: ["TRIALING", "ACTIVE", "PAST_DUE", "INCOMPLETE", "CANCELED"] }
    },
    include: { plan: true },
    orderBy: { updatedAt: "desc" }
  });
  const rawPlanCode = subscription?.plan.code ?? "TRIAL";
  const planCode = planCodes.includes(rawPlanCode as (typeof planCodes)[number])
    ? (rawPlanCode as (typeof planCodes)[number])
    : "TRIAL";

  return canUseEntitlement(
    resolveCommercialAccess({
      planCode,
      status: subscription?.status,
      provider: subscription?.provider,
      trialEndsAt: subscription?.trialEndsAt
    }),
    "gscImpact"
  );
}

async function recordSyncActivity(input: {
  organizationId: string;
  siteId: string;
  propertyUrl: string;
  action: "gsc.metrics_synced" | "gsc.insights_synced";
  startDate: string;
  endDate: string;
  syncedRows: number;
}): Promise<void> {
  const prisma = await getPrisma();
  await prisma.activityLog.create({
    data: {
      organizationId: input.organizationId,
      userId: null,
      action: input.action,
      entityType: "GscConnection",
      entityId: input.siteId,
      metadata: {
        siteId: input.siteId,
        propertyUrl: input.propertyUrl,
        startDate: input.startDate,
        endDate: input.endDate,
        syncedRows: input.syncedRows,
        trigger: "scheduled_sync"
      }
    }
  });
}
