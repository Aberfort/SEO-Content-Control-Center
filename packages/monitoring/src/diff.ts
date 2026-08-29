import type { DetectedEvent, SnapshotFields } from "./types";

/**
 * Compares two URL snapshots and returns the meaningful change events
 * between them. Returns an empty list when `previous` is null (the baseline
 * snapshot never produces events on its own).
 */
export function diffSnapshots(previous: SnapshotFields | null, current: SnapshotFields): DetectedEvent[] {
  if (!previous) {
    return [];
  }

  const events: DetectedEvent[] = [];

  if (previous.httpStatus !== current.httpStatus) {
    const wasOk = previous.httpStatus !== null && previous.httpStatus < 400;
    const becameError = current.httpStatus !== null && current.httpStatus >= 400;

    if (wasOk && becameError) {
      events.push({
        type: current.httpStatus === 404 ? "page_became_404" : "http_status_changed",
        severity: "CRITICAL",
        title: `Page started returning HTTP ${current.httpStatus}`,
        oldValue: previous.httpStatus,
        newValue: current.httpStatus
      });
    } else {
      events.push({
        type: "http_status_changed",
        severity: "WARNING",
        title: `HTTP status changed from ${previous.httpStatus ?? "unknown"} to ${current.httpStatus ?? "unknown"}`,
        oldValue: previous.httpStatus,
        newValue: current.httpStatus
      });
    }
  }

  if (previous.finalUrl && current.finalUrl && previous.finalUrl !== current.finalUrl) {
    events.push({
      type: "redirect_changed",
      severity: "WARNING",
      title: "Redirect destination changed",
      oldValue: previous.finalUrl,
      newValue: current.finalUrl
    });
  }

  if (previous.title !== current.title) {
    events.push({
      type: "title_changed",
      severity: "INFO",
      title: "Title tag changed",
      oldValue: previous.title,
      newValue: current.title
    });
  }

  if (previous.h1 !== current.h1) {
    events.push({
      type: "h1_changed",
      severity: "INFO",
      title: "H1 changed",
      oldValue: previous.h1,
      newValue: current.h1
    });
  }

  if (previous.metaDescription !== current.metaDescription) {
    events.push({
      type: "meta_description_changed",
      severity: "INFO",
      title: "Meta description changed",
      oldValue: previous.metaDescription,
      newValue: current.metaDescription
    });
  }

  if (previous.canonical !== current.canonical) {
    events.push({
      type: "canonical_changed",
      severity: "CRITICAL",
      title: "Canonical URL changed",
      oldValue: previous.canonical,
      newValue: current.canonical
    });
  }

  if (previous.metaRobots !== current.metaRobots) {
    const becameNoindex = !isNoindex(previous.metaRobots) && isNoindex(current.metaRobots);
    events.push({
      type: becameNoindex ? "page_became_noindex" : "robots_changed",
      severity: becameNoindex ? "CRITICAL" : "WARNING",
      title: becameNoindex ? "Page became noindex (meta robots)" : "Meta robots directive changed",
      oldValue: previous.metaRobots,
      newValue: current.metaRobots
    });
  }

  if (previous.xRobotsTag !== current.xRobotsTag) {
    const becameNoindex = !isNoindex(previous.xRobotsTag) && isNoindex(current.xRobotsTag);
    events.push({
      type: becameNoindex ? "page_became_noindex" : "robots_changed",
      severity: becameNoindex ? "CRITICAL" : "WARNING",
      title: becameNoindex ? "Page became noindex (X-Robots-Tag)" : "X-Robots-Tag header changed",
      oldValue: previous.xRobotsTag,
      newValue: current.xRobotsTag
    });
  }

  if (previous.hasStructuredData === true && current.hasStructuredData === false) {
    events.push({
      type: "schema_removed",
      severity: "WARNING",
      title: "Structured data (schema.org) removed",
      oldValue: true,
      newValue: false
    });
  }

  if (previous.hasGa4 === true && current.hasGa4 === false) {
    events.push({
      type: "ga4_missing",
      severity: "CRITICAL",
      title: "GA4 tracking disappeared",
      oldValue: true,
      newValue: false
    });
  }

  if (previous.hasGtm === true && current.hasGtm === false) {
    events.push({
      type: "gtm_missing",
      severity: "CRITICAL",
      title: "GTM container disappeared",
      oldValue: true,
      newValue: false
    });
  }

  if (previous.contentHash && current.contentHash && previous.contentHash !== current.contentHash) {
    events.push({
      type: "content_changed",
      severity: "INFO",
      title: "Page content changed",
      oldValue: previous.contentHash,
      newValue: current.contentHash
    });
  }

  if (previous.responseTimeMs !== null && current.responseTimeMs !== null) {
    const degradedSignificantly =
      current.responseTimeMs > previous.responseTimeMs * 2 &&
      current.responseTimeMs - previous.responseTimeMs > 500;

    if (degradedSignificantly) {
      events.push({
        type: "response_time_degraded",
        severity: "WARNING",
        title: "Response time degraded",
        oldValue: previous.responseTimeMs,
        newValue: current.responseTimeMs
      });
    }
  }

  return events;
}

function isNoindex(value: string | null): boolean {
  return Boolean(value && /noindex/i.test(value));
}
