import { describe, expect, it } from "vitest";

import {
  buildAnalyticsCapturePayload,
  createAnalyticsClient,
  defaultAnalyticsHost,
  isAnalyticsEvent
} from "./analytics";

describe("isAnalyticsEvent", () => {
  it("accepts events from the shared taxonomy and rejects unknown names", () => {
    expect(isAnalyticsEvent("organization_created")).toBe(true);
    expect(isAnalyticsEvent("bulk_operation_completed")).toBe(true);
    expect(isAnalyticsEvent("made_up_event")).toBe(false);
  });
});

describe("buildAnalyticsCapturePayload", () => {
  it("carries tenant context in properties with a server source marker", () => {
    const payload = buildAnalyticsCapturePayload({
      apiKey: "phc_test",
      capture: {
        event: "site_added",
        distinctId: "user-1",
        organizationId: "org-1",
        siteId: "site-1",
        properties: { url: "https://example.com" }
      },
      timestamp: new Date("2026-07-10T00:00:00.000Z")
    });

    expect(payload).toEqual({
      api_key: "phc_test",
      event: "site_added",
      distinct_id: "user-1",
      timestamp: "2026-07-10T00:00:00.000Z",
      properties: {
        url: "https://example.com",
        organizationId: "org-1",
        siteId: "site-1",
        source: "server"
      }
    });
  });
});

describe("createAnalyticsClient", () => {
  it("is disabled without an API key", async () => {
    let called = false;
    const client = createAnalyticsClient({
      apiKey: " ",
      fetchFn: async () => {
        called = true;
        return undefined;
      }
    });

    expect(client.enabled).toBe(false);
    await client.capture({ event: "site_added", distinctId: "user-1" });
    expect(called).toBe(false);
  });

  it("posts captures to the configured host", async () => {
    const requests: Array<{ url: string; body: string }> = [];
    const client = createAnalyticsClient({
      apiKey: "phc_test",
      host: "https://eu.i.posthog.com/",
      now: () => new Date("2026-07-10T00:00:00.000Z"),
      fetchFn: async (url, init) => {
        requests.push({ url, body: init.body });
        return undefined;
      }
    });

    await client.capture({
      event: "organization_created",
      distinctId: "user-1",
      organizationId: "org-1"
    });

    expect(requests[0]?.url).toBe("https://eu.i.posthog.com/capture/");
    expect(JSON.parse(requests[0]!.body)).toMatchObject({
      event: "organization_created",
      distinct_id: "user-1",
      properties: { organizationId: "org-1", source: "server" }
    });
  });

  it("defaults to the PostHog US ingestion host", async () => {
    const urls: string[] = [];
    const client = createAnalyticsClient({
      apiKey: "phc_test",
      fetchFn: async (url) => {
        urls.push(url);
        return undefined;
      }
    });

    await client.capture({ event: "site_added", distinctId: "user-1" });

    expect(urls[0]).toBe(`${defaultAnalyticsHost}/capture/`);
  });

  it("rejects unknown events and blank distinct ids without calling the transport", async () => {
    const errors: unknown[] = [];
    let called = false;
    const client = createAnalyticsClient({
      apiKey: "phc_test",
      onError: (error) => errors.push(error),
      fetchFn: async () => {
        called = true;
        return undefined;
      }
    });

    await client.capture({
      event: "made_up_event" as never,
      distinctId: "user-1"
    });
    await client.capture({ event: "site_added", distinctId: "  " });

    expect(called).toBe(false);
    expect(errors).toHaveLength(2);
  });

  it("fails open when the transport throws", async () => {
    const errors: unknown[] = [];
    const client = createAnalyticsClient({
      apiKey: "phc_test",
      onError: (error) => errors.push(error),
      fetchFn: async () => {
        throw new Error("network down");
      }
    });

    await expect(
      client.capture({ event: "site_added", distinctId: "user-1" })
    ).resolves.toBeUndefined();
    expect(errors).toHaveLength(1);
  });
});
