export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { getAnalyticsClient, getSentryReporter } = await import("@/lib/observability");
  const sentryEnabled = getSentryReporter().enabled;
  const analyticsEnabled = getAnalyticsClient().enabled;

  if (!sentryEnabled) {
    console.warn("Sentry error reporting is disabled. Set SENTRY_DSN to enable it.");
  }

  if (!analyticsEnabled) {
    console.warn("PostHog server analytics is disabled. Set POSTHOG_KEY to enable it.");
  }

  console.info(
    `Observability initialized (sentry: ${sentryEnabled ? "enabled" : "disabled"}, analytics: ${
      analyticsEnabled ? "enabled" : "disabled"
    }).`
  );
}

/**
 * Reports unhandled request errors to Sentry. Only route metadata is
 * attached: request bodies, headers, cookies, and query strings never reach
 * the error reporter.
 */
export async function onRequestError(
  error: unknown,
  request: { path: string; method: string },
  context: { routerKind: string; routePath: string; routeType: string }
): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { getSentryReporter } = await import("@/lib/observability");

  await getSentryReporter().captureException(error, {
    method: request.method,
    path: request.path,
    routerKind: context.routerKind,
    routePath: context.routePath,
    routeType: context.routeType
  });
}
