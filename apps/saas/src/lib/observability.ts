import {
  createAnalyticsClient,
  createSentryReporter,
  type AnalyticsCaptureInput,
  type AnalyticsClient,
  type SentryEventContext,
  type SentryReporter
} from "@sccc/shared";

let sentryReporter: SentryReporter | null = null;
let analyticsClient: AnalyticsClient | null = null;

export function getSentryReporter(): SentryReporter {
  if (!sentryReporter) {
    sentryReporter = createSentryReporter({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development",
      onError: (error) => {
        console.warn(
          "Sentry error reporting failed.",
          error instanceof Error ? error.message : String(error)
        );
      }
    });
  }

  return sentryReporter;
}

export function getAnalyticsClient(): AnalyticsClient {
  if (!analyticsClient) {
    analyticsClient = createAnalyticsClient({
      apiKey: process.env.POSTHOG_KEY,
      host: process.env.POSTHOG_HOST,
      onError: (error) => {
        console.warn(
          "PostHog analytics capture failed.",
          error instanceof Error ? error.message : String(error)
        );
      }
    });
  }

  return analyticsClient;
}

export function resetObservabilityForTest(): void {
  sentryReporter = null;
  analyticsClient = null;
}

/**
 * Fire-and-forget server error reporting. Context must be explicit fields
 * only; request bodies, headers, tokens, and environment values never belong
 * here. Reporting failures are logged and never affect the caller.
 */
export function reportServerError(error: unknown, context?: SentryEventContext): void {
  void getSentryReporter().captureException(error, context);
}

/**
 * Fire-and-forget server analytics capture with tenant context. Events are
 * validated against the shared taxonomy inside the client; failures are
 * logged and never affect the caller.
 */
export function trackAnalyticsEvent(capture: AnalyticsCaptureInput): void {
  void getAnalyticsClient().capture(capture);
}
