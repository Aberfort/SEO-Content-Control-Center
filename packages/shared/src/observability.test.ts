import { describe, expect, it } from "vitest";

import {
  buildSentryEnvelopeUrl,
  buildSentryEventPayload,
  createSentryReporter,
  parseSentryDsn
} from "./observability";

const dsn = "https://publickey@o123.ingest.sentry.io/456";

describe("parseSentryDsn", () => {
  it("parses a valid DSN into envelope parts", () => {
    expect(parseSentryDsn(dsn)).toEqual({
      protocol: "https",
      publicKey: "publickey",
      host: "o123.ingest.sentry.io",
      projectId: "456"
    });
  });

  it("returns null for invalid DSNs", () => {
    expect(parseSentryDsn("")).toBeNull();
    expect(parseSentryDsn("not a dsn")).toBeNull();
    expect(parseSentryDsn("https://sentry.io/456")).toBeNull();
    expect(parseSentryDsn("https://key@sentry.io/")).toBeNull();
    expect(parseSentryDsn("https://key@sentry.io/abc")).toBeNull();
  });
});

describe("buildSentryEventPayload", () => {
  it("includes only the provided error and context fields", () => {
    const payload = buildSentryEventPayload({
      error: new Error("boom"),
      level: "error",
      environment: "production",
      context: { queue: "sccc-bulk-operations", jobName: "bulk-operation.execute" },
      timestamp: new Date("2026-07-10T00:00:00.000Z")
    });

    expect(payload).toMatchObject({
      timestamp: "2026-07-10T00:00:00.000Z",
      level: "error",
      environment: "production",
      extra: { queue: "sccc-bulk-operations", jobName: "bulk-operation.execute" }
    });
    expect(JSON.stringify(payload)).not.toContain("SCCC_");
  });

  it("stringifies non-error values", () => {
    const payload = buildSentryEventPayload({
      error: "plain failure",
      level: "warning",
      environment: "test",
      timestamp: new Date("2026-07-10T00:00:00.000Z")
    }) as { exception: { values: Array<{ type: string; value: string }> } };

    expect(payload.exception.values[0]).toMatchObject({
      type: "Error",
      value: "plain failure"
    });
  });
});

describe("createSentryReporter", () => {
  it("is disabled without a valid DSN", async () => {
    let called = false;
    const reporter = createSentryReporter({
      dsn: null,
      fetchFn: async () => {
        called = true;
        return undefined;
      }
    });

    expect(reporter.enabled).toBe(false);
    await reporter.captureException(new Error("ignored"));
    expect(called).toBe(false);
  });

  it("posts an envelope to the DSN project endpoint", async () => {
    const requests: Array<{ url: string; body: string }> = [];
    const reporter = createSentryReporter({
      dsn,
      environment: "production",
      now: () => new Date("2026-07-10T00:00:00.000Z"),
      fetchFn: async (url, init) => {
        requests.push({ url, body: init.body });
        return undefined;
      }
    });

    expect(reporter.enabled).toBe(true);
    await reporter.captureException(new Error("boom"), { workerId: "host:1" });

    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toBe(buildSentryEnvelopeUrl(parseSentryDsn(dsn)!));
    const [header, itemHeader, event] = requests[0]!.body.split("\n");
    expect(JSON.parse(header!)).toMatchObject({ dsn });
    expect(JSON.parse(itemHeader!)).toEqual({ type: "event" });
    expect(JSON.parse(event!)).toMatchObject({
      level: "error",
      environment: "production",
      extra: { workerId: "host:1" }
    });
  });

  it("fails open when the transport throws", async () => {
    const errors: unknown[] = [];
    const reporter = createSentryReporter({
      dsn,
      onError: (error) => errors.push(error),
      fetchFn: async () => {
        throw new Error("network down");
      }
    });

    await expect(reporter.captureMessage("still fine")).resolves.toBeUndefined();
    expect(errors).toHaveLength(1);
  });
});
