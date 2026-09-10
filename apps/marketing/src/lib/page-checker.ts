import type { ExtractedSignals } from "@sccc/monitoring";

export type PageCheckerActionState = {
  status: "idle" | "error" | "success";
  message: string;
  result?: PageCheckResult;
};

export type FindingSeverity = "critical" | "warning" | "good" | "info";

export type Finding = {
  id: string;
  severity: FindingSeverity;
  label: string;
  detail: string;
};

export type PageCheckResult = {
  requestedUrl: string;
  finalUrl: string;
  httpStatus: number;
  redirected: boolean;
  findings: Finding[];
};

const titleMaxLength = 60;
const titleMinLength = 15;
const descriptionMaxLength = 160;
const descriptionMinLength = 50;
const thinContentWordCount = 300;

/**
 * Parses and validates the URL a visitor submits to the free page checker.
 * Only shape validation (protocol, hostname) — the actual SSRF/private-network
 * check happens inside `crawlUrl` itself via the shared guard, so this stays a
 * light first pass for a clear, fast error message.
 */
export function parseCheckerUrl(input: unknown): { success: true; url: string } | { success: false; error: string } {
  const raw = typeof input === "string" ? input.trim() : "";

  if (!raw) {
    return { success: false, error: "Enter a URL to check." };
  }

  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  let parsed: URL;

  try {
    parsed = new URL(candidate);
  } catch {
    return { success: false, error: "Enter a valid URL, like https://example.com/blog/post" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { success: false, error: "Only http:// and https:// URLs are supported." };
  }

  if (!parsed.hostname || !parsed.hostname.includes(".")) {
    return { success: false, error: "Enter a valid URL, like https://example.com/blog/post" };
  }

  return { success: true, url: parsed.toString() };
}

/**
 * Turns raw crawl output into the same kind of findings Content Signal's
 * product audit looks for, scaled down to what a single on-demand fetch can
 * see. This is deliberately a quick, honest subset — not a replacement for
 * the plugin's full bounded-batch content audit, which also checks every
 * post on a site rather than one URL at a time.
 */
export function evaluateFindings(input: {
  httpStatus: number;
  signals: ExtractedSignals;
  approxWordCount: number;
  xRobotsTag: string | null;
}): Finding[] {
  const { httpStatus, signals, approxWordCount, xRobotsTag } = input;
  const findings: Finding[] = [];

  if (httpStatus < 200 || httpStatus >= 300) {
    findings.push({
      id: "http-status",
      severity: "critical",
      label: `Responded with HTTP ${httpStatus}`,
      detail:
        httpStatus >= 300 && httpStatus < 400
          ? "This URL redirects. Search engines will index the destination, not this address — make sure that's intentional."
          : "A non-2xx response can keep this page out of the index entirely."
    });
  }

  const robotsBlocksIndexing = signals.metaRobots?.includes("noindex") ?? false;

  if (robotsBlocksIndexing) {
    findings.push({
      id: "noindex",
      severity: "critical",
      label: "Marked noindex",
      detail: `The meta robots tag says "${signals.metaRobots}". Search engines will not index this page while that's set — this is the single most common accidental-exclusion cause.`
    });
  } else {
    findings.push({
      id: "noindex",
      severity: "good",
      label: "Not blocked from indexing",
      detail: signals.metaRobots
        ? `Meta robots is set to "${signals.metaRobots}", which allows indexing.`
        : "No meta robots tag was found, which defaults to indexable."
    });
  }

  const headerBlocksIndexing = xRobotsTag?.toLowerCase().includes("noindex") ?? false;

  if (headerBlocksIndexing) {
    findings.push({
      id: "x-robots-tag",
      severity: "critical",
      label: "Blocked by an X-Robots-Tag header",
      detail: `The HTTP response sent "X-Robots-Tag: ${xRobotsTag}". This is invisible in the page source and in most SEO plugins — it's usually set at the server or CDN level, often a leftover from a staging environment's blanket noindex rule.`
    });
  }

  if (!signals.title) {
    findings.push({
      id: "title",
      severity: "critical",
      label: "Missing title tag",
      detail: "Every indexable page needs a <title>. Without one, search engines write their own from the page content."
    });
  } else if (signals.title.length > titleMaxLength) {
    findings.push({
      id: "title",
      severity: "warning",
      label: `Title is ${signals.title.length} characters`,
      detail: `Titles beyond ~${titleMaxLength} characters usually get truncated in search results. Current: "${signals.title}"`
    });
  } else if (signals.title.length < titleMinLength) {
    findings.push({
      id: "title",
      severity: "warning",
      label: `Title is only ${signals.title.length} characters`,
      detail: `"${signals.title}" — there's room to describe the page more specifically.`
    });
  } else {
    findings.push({
      id: "title",
      severity: "good",
      label: "Title length looks right",
      detail: `"${signals.title}" (${signals.title.length} characters)`
    });
  }

  if (!signals.metaDescription) {
    findings.push({
      id: "meta-description",
      severity: "warning",
      label: "Missing meta description",
      detail: "Without one, search engines pull a snippet from the page body, which you don't control."
    });
  } else if (signals.metaDescription.length > descriptionMaxLength) {
    findings.push({
      id: "meta-description",
      severity: "warning",
      label: `Meta description is ${signals.metaDescription.length} characters`,
      detail: `Beyond ~${descriptionMaxLength} characters it usually truncates in search results.`
    });
  } else if (signals.metaDescription.length < descriptionMinLength) {
    findings.push({
      id: "meta-description",
      severity: "warning",
      label: `Meta description is only ${signals.metaDescription.length} characters`,
      detail: "There's room to make this a more complete, click-worthy summary."
    });
  } else {
    findings.push({
      id: "meta-description",
      severity: "good",
      label: "Meta description length looks right",
      detail: `${signals.metaDescription.length} characters.`
    });
  }

  if (!signals.h1) {
    findings.push({
      id: "h1",
      severity: "warning",
      label: "No H1 found",
      detail: "An H1 gives both readers and search engines a clear statement of what the page is about."
    });
  } else {
    findings.push({
      id: "h1",
      severity: "good",
      label: "H1 present",
      detail: `"${signals.h1}"`
    });
  }

  if (!signals.canonical) {
    findings.push({
      id: "canonical",
      severity: "info",
      label: "No canonical tag",
      detail: "Not always required, but a self-referencing canonical is a cheap guard against duplicate-content issues."
    });
  } else {
    findings.push({
      id: "canonical",
      severity: "good",
      label: "Canonical tag present",
      detail: signals.canonical
    });
  }

  if (approxWordCount > 0 && approxWordCount < thinContentWordCount) {
    findings.push({
      id: "thin-content",
      severity: "warning",
      label: `Roughly ${approxWordCount} words of body text`,
      detail: `Pages under ~${thinContentWordCount} words for informational queries often struggle to rank on their own merit. This is an approximate count from this one fetch, not a definitive measure.`
    });
  }

  if (!signals.hasStructuredData) {
    findings.push({
      id: "structured-data",
      severity: "info",
      label: "No structured data detected",
      detail: "Adding JSON-LD (Article, FAQPage, BreadcrumbList) can earn richer search result presentation, depending on the page type."
    });
  } else {
    findings.push({
      id: "structured-data",
      severity: "good",
      label: "Structured data found",
      detail: "At least one JSON-LD block is present on the page."
    });
  }

  return findings;
}

/** A fast, approximate word count from raw HTML — good enough to flag thin content, not a precise measure. */
export function approximateWordCount(html: string): number {
  const withoutScripts = html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ");
  const text = withoutScripts.replace(/<[^>]+>/g, " ").replace(/&[a-z0-9#]+;/gi, " ");
  const words = text.split(/\s+/).filter(Boolean);
  return words.length;
}
