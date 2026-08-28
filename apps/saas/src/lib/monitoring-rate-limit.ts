import { assertRateLimit, rateLimitKeyFromHeaders } from "./rate-limit";

type MonitoringCrawlRateLimitInput = {
  request: Request;
  userId: string;
  organizationId: string;
  siteId: string;
  action: string;
  monitoredUrlId?: string;
};

export async function assertMonitoringCrawlRateLimit(
  input: MonitoringCrawlRateLimitInput
): Promise<void> {
  await assertRateLimit(
    "monitoring-crawl",
    rateLimitKeyFromHeaders(
      input.request.headers,
      buildMonitoringCrawlRateLimitKey({
        userId: input.userId,
        organizationId: input.organizationId,
        siteId: input.siteId,
        action: input.action,
        monitoredUrlId: input.monitoredUrlId
      })
    )
  );
}

export function buildMonitoringCrawlRateLimitKey(input: {
  userId: string;
  organizationId: string;
  siteId: string;
  action: string;
  monitoredUrlId?: string;
}): string {
  return [
    input.userId,
    input.organizationId,
    input.siteId,
    input.action,
    input.monitoredUrlId ?? "site"
  ].join(":");
}
