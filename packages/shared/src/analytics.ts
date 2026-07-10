import { analyticsEvents, type AnalyticsEvent } from "./events";

export const defaultAnalyticsHost = "https://us.i.posthog.com";

export type AnalyticsCaptureInput = {
  event: AnalyticsEvent;
  distinctId: string;
  organizationId?: string;
  siteId?: string;
  properties?: Record<string, string | number | boolean | null>;
};

export type AnalyticsClient = {
  enabled: boolean;
  capture(input: AnalyticsCaptureInput): Promise<void>;
};

type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string }
) => Promise<unknown>;

type CreateAnalyticsClientInput = {
  apiKey?: string | null;
  host?: string | null;
  fetchFn?: FetchLike;
  now?: () => Date;
  onError?: (error: unknown) => void;
};

export function isAnalyticsEvent(event: string): event is AnalyticsEvent {
  return analyticsEvents.includes(event as AnalyticsEvent);
}

/**
 * Builds the PostHog capture payload with explicit tenant context. Only the
 * provided fields are sent; the payload never includes environment variables,
 * tokens, or other ambient state.
 */
export function buildAnalyticsCapturePayload(input: {
  apiKey: string;
  capture: AnalyticsCaptureInput;
  timestamp: Date;
}): Record<string, unknown> {
  return {
    api_key: input.apiKey,
    event: input.capture.event,
    distinct_id: input.capture.distinctId,
    timestamp: input.timestamp.toISOString(),
    properties: {
      ...(input.capture.properties ?? {}),
      ...(input.capture.organizationId ? { organizationId: input.capture.organizationId } : {}),
      ...(input.capture.siteId ? { siteId: input.capture.siteId } : {}),
      source: "server"
    }
  };
}

/**
 * Creates a dependency-free PostHog server client. Capture is disabled (a
 * no-op) without an API key, rejects unknown event names so the shared event
 * taxonomy in `events.ts` stays authoritative, and always fails open:
 * analytics problems never break the calling request or job.
 */
export function createAnalyticsClient(input: CreateAnalyticsClientInput): AnalyticsClient {
  const apiKey = input.apiKey?.trim();

  if (!apiKey) {
    return {
      enabled: false,
      async capture() {}
    };
  }

  const fetchFn: FetchLike = input.fetchFn ?? ((url, init) => fetch(url, init));
  const now = input.now ?? (() => new Date());
  const host = (input.host?.trim() || defaultAnalyticsHost).replace(/\/+$/, "");

  return {
    enabled: true,
    async capture(capture) {
      if (!isAnalyticsEvent(capture.event) || !capture.distinctId.trim()) {
        input.onError?.(new Error(`Rejected analytics capture for event "${capture.event}".`));
        return;
      }

      try {
        await fetchFn(`${host}/capture/`, {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify(
            buildAnalyticsCapturePayload({
              apiKey,
              capture,
              timestamp: now()
            })
          )
        });
      } catch (error) {
        input.onError?.(error);
      }
    }
  };
}
