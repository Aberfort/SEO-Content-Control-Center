"use server";

import { crawlUrl, extractSignals, UnsafeUrlError } from "@sccc/monitoring";
import { cookies, headers } from "next/headers";

import { captureMarketingEvent } from "../../../lib/analytics";
import {
  approximateWordCount,
  evaluateFindings,
  parseCheckerUrl,
  type Finding,
  type PageCheckerActionState
} from "../../../lib/page-checker";
import { consumeRateLimit, readClientKey } from "../../../lib/rate-limit";
import { anonymousDistinctId, visitorIdCookieName } from "../../../lib/visitor";

const checkerRateLimit = { windowMs: 15 * 60 * 1000, maxRequests: 10 };

export async function checkPageAction(
  _previousState: PageCheckerActionState,
  formData: FormData
): Promise<PageCheckerActionState> {
  const parsed = parseCheckerUrl(formData.get("url"));

  if (!parsed.success) {
    return { status: "error", message: parsed.error };
  }

  const requestHeaders = await headers();
  const clientKey = readClientKey(requestHeaders);

  if (!consumeRateLimit("page-checker", clientKey, checkerRateLimit)) {
    return {
      status: "error",
      message: "Too many checks from this connection. Please wait 15 minutes and try again."
    };
  }

  try {
    const crawl = await crawlUrl(parsed.url, {
      timeoutMs: 8000,
      maxBytes: 2_000_000,
      userAgent: "ContentSignalBot/1.0 (+https://getcontentsignal.com/bot)"
    });

    const signals = extractSignals(crawl.html);
    const approxWordCount = approximateWordCount(crawl.html);
    const findings = evaluateFindings({
      httpStatus: crawl.httpStatus,
      signals,
      approxWordCount,
      xRobotsTag: crawl.xRobotsTag
    });

    await captureCheckerUsed(parsed.url, findings);

    return {
      status: "success",
      message: "",
      result: {
        requestedUrl: parsed.url,
        finalUrl: crawl.finalUrl,
        httpStatus: crawl.httpStatus,
        redirected: crawl.finalUrl !== parsed.url,
        findings
      }
    };
  } catch (error) {
    if (error instanceof UnsafeUrlError) {
      return { status: "error", message: describeUnsafeUrlError(error.message) };
    }

    console.error("Page checker crawl failed", {
      error: error instanceof Error ? error.message : "Unknown crawl error"
    });

    return {
      status: "error",
      message: "We couldn't fetch that URL. It may be blocking automated requests, or it timed out."
    };
  }
}

function describeUnsafeUrlError(code: string): string {
  if (code.startsWith("DNS_RESOLVED_PRIVATE_ADDRESS") || code === "DNS_RESOLUTION_EMPTY") {
    return "That URL doesn't resolve to a public address, so we can't fetch it.";
  }

  if (code === "URL_PROTOCOL_NOT_ALLOWED") {
    return "Only http:// and https:// URLs are supported.";
  }

  return "That URL couldn't be fetched safely.";
}

/**
 * Fires the `page_checker_used` funnel event. Captures the hostname and a
 * coarse result summary only — never the full submitted URL (which can
 * carry query strings or paths a visitor wouldn't expect to see logged).
 */
async function captureCheckerUsed(url: string, findings: Finding[]): Promise<void> {
  const cookieStore = await cookies();
  const distinctId = cookieStore.get(visitorIdCookieName)?.value || anonymousDistinctId();
  let hostname = "unknown";

  try {
    hostname = new URL(url).hostname;
  } catch {
    // Already validated by parseCheckerUrl; this branch is unreachable in practice.
  }

  await captureMarketingEvent({
    event: "page_checker_used",
    distinctId,
    properties: {
      hostname,
      criticalCount: findings.filter((finding) => finding.severity === "critical").length,
      warningCount: findings.filter((finding) => finding.severity === "warning").length
    }
  });
}
