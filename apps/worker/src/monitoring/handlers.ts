import { monitoringCreateSnapshotJobDataSchema } from "@sccc/queue";
import { diffSnapshots, type CrawlResult, type DetectedEvent, type ExtractedSignals, type SnapshotFields } from "@sccc/monitoring";

import type { JobHandler } from "../job-handlers";

export type MonitoringMonitoredUrl = {
  id: string;
  url: string;
  isActive: boolean;
};

export type MonitoringSnapshotDeps = {
  loadMonitoredUrl(
    organizationId: string,
    siteId: string,
    monitoredUrlId: string
  ): Promise<MonitoringMonitoredUrl | null>;
  getLatestSnapshot(monitoredUrlId: string): Promise<SnapshotFields | null>;
  crawl(url: string): Promise<CrawlResult>;
  extract(html: string): ExtractedSignals;
  saveSnapshot(input: {
    organizationId: string;
    siteId: string;
    monitoredUrlId: string;
    isBaseline: boolean;
    fields: SnapshotFields;
  }): Promise<void>;
  saveEvents(input: {
    organizationId: string;
    siteId: string;
    monitoredUrlId: string;
    events: DetectedEvent[];
  }): Promise<void>;
};

/**
 * Fetches the current state of a monitored URL, stores it as a snapshot, and
 * — when a previous snapshot exists — diffs the two into Event rows. The
 * first snapshot for a URL is always the baseline and never produces events.
 */
export function createMonitoringCreateSnapshotHandler(deps: MonitoringSnapshotDeps): JobHandler {
  return async (job) => {
    const data = monitoringCreateSnapshotJobDataSchema.parse(job.data);
    const monitoredUrl = await deps.loadMonitoredUrl(
      data.organizationId,
      data.siteId,
      data.monitoredUrlId
    );

    if (!monitoredUrl) {
      throw new Error("MONITORED_URL_NOT_FOUND");
    }

    if (!monitoredUrl.isActive) {
      throw new Error("MONITORED_URL_INACTIVE");
    }

    const previous = await deps.getLatestSnapshot(data.monitoredUrlId);
    const crawl = await deps.crawl(monitoredUrl.url);
    const signals = deps.extract(crawl.html);
    const fields: SnapshotFields = {
      httpStatus: crawl.httpStatus,
      finalUrl: crawl.finalUrl,
      responseTimeMs: crawl.responseTimeMs,
      xRobotsTag: crawl.xRobotsTag,
      title: signals.title,
      metaDescription: signals.metaDescription,
      h1: signals.h1,
      canonical: signals.canonical,
      metaRobots: signals.metaRobots,
      hasStructuredData: signals.hasStructuredData,
      hasGa4: signals.hasGa4,
      hasGtm: signals.hasGtm,
      contentHash: signals.contentHash,
      htmlHash: signals.htmlHash
    };
    const isBaseline = previous === null;

    await deps.saveSnapshot({
      organizationId: data.organizationId,
      siteId: data.siteId,
      monitoredUrlId: data.monitoredUrlId,
      isBaseline,
      fields
    });

    const events = diffSnapshots(previous, fields);

    if (events.length > 0) {
      await deps.saveEvents({
        organizationId: data.organizationId,
        siteId: data.siteId,
        monitoredUrlId: data.monitoredUrlId,
        events
      });
    }

    return { isBaseline, eventCount: events.length };
  };
}
