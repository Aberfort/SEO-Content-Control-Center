import { monitoringCreateSnapshotJobDataSchema } from "@sccc/queue";
import {
  detectRegressions,
  diffSnapshots,
  type CrawlResult,
  type DetectedEvent,
  type EventSeverity,
  type ExtractedSignals,
  type RegressionCandidate,
  type SnapshotFields,
  type TrafficSignal
} from "@sccc/monitoring";

import type { JobHandler } from "../job-handlers";
import {
  monitoringRescanIntervalHours,
  planMonitoringScanJobs,
  type MonitoringScanCandidate,
  type PlannedMonitoringScanJob
} from "./plan";

export type MonitoringMonitoredUrl = {
  id: string;
  url: string;
  isActive: boolean;
};

export type PersistedEvent = {
  id: string;
  type: string;
  severity: EventSeverity;
  title: string;
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
  }): Promise<PersistedEvent[]>;
  getSiteTrafficSignal(siteId: string): Promise<TrafficSignal | null>;
  saveRegressions(input: {
    organizationId: string;
    siteId: string;
    monitoredUrlId: string;
    candidates: RegressionCandidate[];
  }): Promise<number>;
};

/**
 * Fetches the current state of a monitored URL, stores it as a snapshot, and
 * — when a previous snapshot exists — diffs the two into Event rows. The
 * first snapshot for a URL is always the baseline and never produces events.
 * Newly persisted events are then run through the deterministic regression
 * engine, correlated with the site's Search Console traffic trend.
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

    const detected = diffSnapshots(previous, fields);
    let persistedEvents: PersistedEvent[] = [];

    if (detected.length > 0) {
      persistedEvents = await deps.saveEvents({
        organizationId: data.organizationId,
        siteId: data.siteId,
        monitoredUrlId: data.monitoredUrlId,
        events: detected
      });
    }

    let regressionCount = 0;

    if (persistedEvents.length > 0) {
      const siteTraffic = await deps.getSiteTrafficSignal(data.siteId);
      const candidates = detectRegressions({
        monitoredUrlId: data.monitoredUrlId,
        events: persistedEvents,
        siteTraffic
      });

      if (candidates.length > 0) {
        regressionCount = await deps.saveRegressions({
          organizationId: data.organizationId,
          siteId: data.siteId,
          monitoredUrlId: data.monitoredUrlId,
          candidates
        });
      }
    }

    return { isBaseline, eventCount: detected.length, regressionCount };
  };
}

export type MonitoringScheduleDeps = {
  listMonitoredUrlsDueForScan(cutoff: Date): Promise<MonitoringScanCandidate[]>;
  enqueue(job: PlannedMonitoringScanJob): Promise<void>;
  now?: () => Date;
};

/**
 * Fans out one create-snapshot job for every active monitored URL that has
 * not been scanned within the rescan interval. Runs on a repeatable BullMQ
 * schedule so monitored URLs keep getting rescanned without manual clicks.
 */
export function createMonitoringScheduleScanHandler(deps: MonitoringScheduleDeps): JobHandler {
  return async () => {
    const now = deps.now?.() ?? new Date();
    const cutoff = new Date(now.getTime() - monitoringRescanIntervalHours * 60 * 60 * 1000);
    const candidates = await deps.listMonitoredUrlsDueForScan(cutoff);
    const jobs = planMonitoringScanJobs(candidates, now);

    for (const job of jobs) {
      await deps.enqueue(job);
    }

    return { candidates: candidates.length, scheduledJobs: jobs.length };
  };
}
