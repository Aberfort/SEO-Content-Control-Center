import { describe, expect, it } from "vitest";

import { buildWorkerObservability } from "./observability";

function env(values: Record<string, string> = {}): NodeJS.ProcessEnv {
  return { NODE_ENV: "test", ...values } as NodeJS.ProcessEnv;
}

describe("buildWorkerObservability", () => {
  it("keeps both clients disabled without configuration", () => {
    const observability = buildWorkerObservability(env());

    expect(observability.sentry.enabled).toBe(false);
    expect(observability.analytics.enabled).toBe(false);
  });

  it("enables Sentry with a valid DSN and analytics with a PostHog key", () => {
    const observability = buildWorkerObservability(
      env({
        SENTRY_DSN: "https://publickey@o123.ingest.sentry.io/456",
        POSTHOG_KEY: "phc_test"
      })
    );

    expect(observability.sentry.enabled).toBe(true);
    expect(observability.analytics.enabled).toBe(true);
  });

  it("keeps Sentry disabled for malformed DSNs", () => {
    const observability = buildWorkerObservability(env({ SENTRY_DSN: "not-a-dsn" }));

    expect(observability.sentry.enabled).toBe(false);
  });
});
