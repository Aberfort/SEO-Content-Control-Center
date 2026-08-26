import { crawlUrl, extractSignals } from "@sccc/monitoring";
import { Prisma } from "@prisma/client";

import type { MonitoringSnapshotDeps } from "./handlers";

async function getPrisma() {
  const { prisma } = await import("@sccc/database");
  return prisma;
}

export function isMonitoringWorkerConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.DATABASE_URL?.trim());
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
    async saveEvents(input) {
      const prisma = await getPrisma();
      const occurredAt = new Date();

      await prisma.event.createMany({
        data: input.events.map((event) => ({
          organizationId: input.organizationId,
          siteId: input.siteId,
          monitoredUrlId: input.monitoredUrlId,
          source: "CRAWLER" as const,
          type: event.type,
          severity: event.severity,
          title: event.title,
          oldValue: toNullableJson(event.oldValue),
          newValue: toNullableJson(event.newValue),
          metadata: event.metadata ? (event.metadata as Prisma.InputJsonValue) : undefined,
          occurredAt
        }))
      });
    }
  };
}

function toNullableJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value === null || typeof value === "undefined") {
    return Prisma.JsonNull;
  }

  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
