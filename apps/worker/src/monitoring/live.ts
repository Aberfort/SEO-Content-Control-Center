import {
  computeTrafficSignal,
  crawlUrl,
  extractSignals,
  type DailyMetricPoint,
  type RegressionCandidate,
  type RegressionEngineEvent
} from "@sccc/monitoring";
import { Prisma } from "@prisma/client";

import { deliverWorkspaceAlert } from "../deliverables/live";
import type { MonitoringScheduleDeps, MonitoringSnapshotDeps, PersistedEvent } from "./handlers";
import type { PlannedMonitoringScanJob } from "./plan";

async function getPrisma() {
  const { prisma } = await import("@sccc/database");
  return prisma;
}

export function isMonitoringWorkerConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.DATABASE_URL?.trim());
}

export function buildLiveMonitoringScheduleDeps(
  enqueue: (job: PlannedMonitoringScanJob) => Promise<void>
): MonitoringScheduleDeps {
  return {
    async listMonitoredUrlsDueForScan(cutoff) {
      const prisma = await getPrisma();
      const monitoredUrls = await prisma.monitoredUrl.findMany({
        where: { isActive: true },
        select: {
          id: true,
          organizationId: true,
          siteId: true,
          snapshots: {
            orderBy: { capturedAt: "desc" },
            take: 1,
            select: { capturedAt: true }
          }
        }
      });

      return monitoredUrls
        .filter((monitoredUrl) => {
          const latest = monitoredUrl.snapshots[0];
          return !latest || latest.capturedAt < cutoff;
        })
        .map((monitoredUrl) => ({
          organizationId: monitoredUrl.organizationId,
          siteId: monitoredUrl.siteId,
          monitoredUrlId: monitoredUrl.id
        }));
    },
    enqueue
  };
}

export function buildLiveMonitoringSnapshotDeps(): MonitoringSnapshotDeps {
  return {
    async loadMonitoredUrl(organizationId, siteId, monitoredUrlId) {
      const prisma = await getPrisma();
      const record = await prisma.monitoredUrl.findFirst({
        where: { id: monitoredUrlId, organizationId, siteId }
      });

      return record ? { id: record.id, url: record.url, isActive: record.isActive } : null;
    },
    async getLatestSnapshot(monitoredUrlId) {
      const prisma = await getPrisma();
      const snapshot = await prisma.urlSnapshot.findFirst({
        where: { monitoredUrlId },
        orderBy: { capturedAt: "desc" }
      });

      if (!snapshot) {
        return null;
      }

      return {
        httpStatus: snapshot.httpStatus,
        finalUrl: snapshot.finalUrl,
        responseTimeMs: snapshot.responseTimeMs,
        title: snapshot.title,
        metaDescription: snapshot.metaDescription,
        h1: snapshot.h1,
        canonical: snapshot.canonical,
        metaRobots: snapshot.metaRobots,
        xRobotsTag: snapshot.xRobotsTag,
        hasStructuredData: snapshot.hasStructuredData,
        hasGa4: snapshot.hasGa4,
        hasGtm: snapshot.hasGtm,
        contentHash: snapshot.contentHash,
        htmlHash: snapshot.htmlHash
      };
    },
    crawl(url) {
      return crawlUrl(url);
    },
    extract(html) {
      return extractSignals(html);
    },
    async saveSnapshot(input) {
      const prisma = await getPrisma();
      await prisma.urlSnapshot.create({
        data: {
          monitoredUrlId: input.monitoredUrlId,
          organizationId: input.organizationId,
          siteId: input.siteId,
          isBaseline: input.isBaseline,
          httpStatus: input.fields.httpStatus,
          finalUrl: input.fields.finalUrl,
          responseTimeMs: input.fields.responseTimeMs,
          title: input.fields.title,
          metaDescription: input.fields.metaDescription,
          h1: input.fields.h1,
          canonical: input.fields.canonical,
          metaRobots: input.fields.metaRobots,
          xRobotsTag: input.fields.xRobotsTag,
          hasStructuredData: input.fields.hasStructuredData,
          hasGa4: input.fields.hasGa4,
          hasGtm: input.fields.hasGtm,
          contentHash: input.fields.contentHash,
          htmlHash: input.fields.htmlHash
        }
      });
    },
    async saveEvents(input): Promise<PersistedEvent[]> {
      const prisma = await getPrisma();
      const occurredAt = new Date();
      const persisted: PersistedEvent[] = [];

      for (const event of input.events) {
        const created = await prisma.event.create({
          data: {
            organizationId: input.organizationId,
            siteId: input.siteId,
            monitoredUrlId: input.monitoredUrlId,
            source: "CRAWLER",
            type: event.type,
            severity: event.severity,
            title: event.title,
            oldValue: toNullableJson(event.oldValue),
            newValue: toNullableJson(event.newValue),
            metadata: event.metadata ? (event.metadata as Prisma.InputJsonValue) : undefined,
            occurredAt
          }
        });

        persisted.push({
          id: created.id,
          type: created.type,
          severity: created.severity,
          title: created.title,
          occurredAt: created.occurredAt.toISOString()
        });
      }

      return persisted;
    },
    async getRecentWordPressEvents(siteId, since): Promise<RegressionEngineEvent[]> {
      const prisma = await getPrisma();
      const events = await prisma.event.findMany({
        where: {
          siteId,
          source: "WORDPRESS",
          occurredAt: { gte: since }
        },
        orderBy: { occurredAt: "desc" }
      });

      return events.map((event) => ({
        id: event.id,
        type: event.type,
        severity: event.severity,
        title: event.title,
        occurredAt: event.occurredAt.toISOString()
      }));
    },
    async getSiteTrafficSignal(siteId) {
      const prisma = await getPrisma();
      const metrics = await prisma.gscDailyMetric.findMany({
        where: { siteId },
        select: { date: true, clicks: true, position: true }
      });

      if (metrics.length === 0) {
        return null;
      }

      const byDate = new Map<string, { clicks: number; positionSum: number; positionCount: number }>();

      for (const metric of metrics) {
        const dateKey = metric.date.toISOString().slice(0, 10);
        const entry = byDate.get(dateKey) ?? { clicks: 0, positionSum: 0, positionCount: 0 };
        entry.clicks += metric.clicks;
        entry.positionSum += metric.position;
        entry.positionCount += 1;
        byDate.set(dateKey, entry);
      }

      const points: DailyMetricPoint[] = [...byDate.entries()].map(([date, entry]) => ({
        date,
        clicks: entry.clicks,
        position: entry.positionCount > 0 ? entry.positionSum / entry.positionCount : null
      }));

      return computeTrafficSignal(points);
    },
    async saveRegressions(input) {
      let createdCount = 0;

      for (const candidate of input.candidates) {
        const created = await persistRegressionCandidate(candidate, {
          organizationId: input.organizationId,
          siteId: input.siteId,
          monitoredUrlId: input.monitoredUrlId
        });

        if (created) {
          createdCount += 1;
        }
      }

      return createdCount;
    }
  };
}

async function persistRegressionCandidate(
  candidate: RegressionCandidate,
  input: { organizationId: string; siteId: string; monitoredUrlId: string }
): Promise<boolean> {
  const prisma = await getPrisma();
  const existing = await prisma.regression.findUnique({
    where: {
      organizationId_siteId_fingerprint: {
        organizationId: input.organizationId,
        siteId: input.siteId,
        fingerprint: candidate.fingerprint
      }
    }
  });

  if (existing) {
    return false;
  }

  const regression = await prisma.$transaction(async (tx) => {
    const created = await tx.regression.create({
      data: {
        organizationId: input.organizationId,
        siteId: input.siteId,
        monitoredUrlId: input.monitoredUrlId,
        fingerprint: candidate.fingerprint,
        severity: candidate.severity,
        title: candidate.title,
        summary: candidate.summary,
        metrics: candidate.metrics ? (candidate.metrics as Prisma.InputJsonValue) : undefined
      }
    });

    await tx.regressionEvent.createMany({
      data: candidate.eventIds.map((eventId) => ({
        regressionId: created.id,
        eventId
      }))
    });

    await tx.notification.create({
      data: {
        organizationId: input.organizationId,
        type: "regression.detected",
        title: created.title,
        body: created.summary
      }
    });

    return created;
  });

  if (candidate.severity === "CRITICAL") {
    await deliverWorkspaceAlert({
      organizationId: input.organizationId,
      preference: "trafficDropAlerts",
      title: regression.title,
      body: regression.summary,
      actionPath: "/monitoring"
    }).catch(() => undefined);
  }

  return true;
}

function toNullableJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value === null || typeof value === "undefined") {
    return Prisma.JsonNull;
  }

  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
