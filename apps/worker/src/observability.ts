import {
  createAnalyticsClient,
  createSentryReporter,
  type AnalyticsClient,
  type SentryReporter
} from "@sccc/shared";

import { logWorkerEvent, serializeError } from "./logger";

export type WorkerObservability = {
  sentry: SentryReporter;
  analytics: AnalyticsClient;
};

/**
 * Builds the env-gated worker observability clients. Both stay no-ops until
 * `SENTRY_DSN` / `POSTHOG_KEY` are configured, and both fail open: telemetry
 * transport problems are logged (without secrets) and never affect jobs.
 */
export function buildWorkerObservability(
  env: NodeJS.ProcessEnv = process.env
): WorkerObservability {
  return {
    sentry: createSentryReporter({
      dsn: env.SENTRY_DSN,
      environment: env.SENTRY_ENVIRONMENT || env.NODE_ENV || "development",
      onError: (error) => {
        logWorkerEvent("warn", "worker.sentry_report_failed", {
          reason: serializeError(error)
        });
      }
    }),
    analytics: createAnalyticsClient({
      apiKey: env.POSTHOG_KEY,
      host: env.POSTHOG_HOST,
      onError: (error) => {
        logWorkerEvent("warn", "worker.analytics_capture_failed", {
          reason: serializeError(error)
        });
      }
    })
  };
}
