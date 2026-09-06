import { createAnalyticsClient, type AnalyticsClient, type AnalyticsEvent } from "@sccc/shared";

/**
 * Server-side-only PostHog capture for the marketing site, reusing the same
 * dependency-free client the SaaS app uses (`@sccc/shared`). There is no
 * client-side analytics script: every event is captured from a Server
 * Action or route handler, so pages ship no tracking JS and visitors need no
 * cookie-consent banner for it. Disabled (a no-op) whenever `POSTHOG_KEY`
 * isn't set, and always fails open — a capture failure never breaks the
 * request that triggered it.
 *
 * Node.js runtime only (Server Actions, route handlers). Edge Middleware
 * captures pageviews itself with an inline fetch instead of importing this
 * module — `@sccc/shared`'s barrel export pulls in `plugin-signing.ts`,
 * which needs `node:crypto` and cannot be bundled for the Edge runtime.
 */
let cachedClient: AnalyticsClient | null = null;

function getMarketingAnalyticsClient(): AnalyticsClient {
  if (!cachedClient) {
    cachedClient = createAnalyticsClient({
      apiKey: process.env.POSTHOG_KEY,
      host: process.env.POSTHOG_HOST,
      onError: (error) => {
        console.error("Marketing analytics capture failed", {
          error: error instanceof Error ? error.message : "Unknown analytics error"
        });
      }
    });
  }

  return cachedClient;
}

export type CaptureMarketingEventInput = {
  event: AnalyticsEvent;
  distinctId: string;
  properties?: Record<string, string | number | boolean | null>;
};

export async function captureMarketingEvent(input: CaptureMarketingEventInput): Promise<void> {
  await getMarketingAnalyticsClient().capture(input);
}
