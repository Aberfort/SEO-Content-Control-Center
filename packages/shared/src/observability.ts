export type SentryDsnParts = {
  protocol: string;
  publicKey: string;
  host: string;
  projectId: string;
};

export type SentryEventContext = Record<string, string | number | boolean | null>;

export type SentryReporter = {
  enabled: boolean;
  captureException(error: unknown, context?: SentryEventContext): Promise<void>;
  captureMessage(message: string, context?: SentryEventContext): Promise<void>;
};

type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string }
) => Promise<unknown>;

type CreateSentryReporterInput = {
  dsn?: string | null;
  environment?: string;
  release?: string;
  fetchFn?: FetchLike;
  now?: () => Date;
  onError?: (error: unknown) => void;
};

/**
 * Parses a Sentry DSN (`https://<publicKey>@<host>/<projectId>`) into the
 * parts needed for the envelope endpoint. Returns null for anything that does
 * not look like a valid DSN so misconfiguration disables reporting instead of
 * throwing at startup.
 */
export function parseSentryDsn(dsn: string): SentryDsnParts | null {
  let parsed: URL;

  try {
    parsed = new URL(dsn.trim());
  } catch {
    return null;
  }

  const projectId = parsed.pathname.replace(/^\/+/, "").replace(/\/+$/, "");

  if (!parsed.username || !parsed.hostname || !projectId || !/^\d+$/.test(projectId)) {
    return null;
  }

  return {
    protocol: parsed.protocol.replace(":", ""),
    publicKey: parsed.username,
    host: parsed.host,
    projectId
  };
}

export function buildSentryEnvelopeUrl(parts: SentryDsnParts): string {
  return `${parts.protocol}://${parts.host}/api/${parts.projectId}/envelope/`;
}

/**
 * Builds the Sentry event payload from an explicit error and context object.
 * Only the provided fields are sent: the payload never includes environment
 * variables, request bodies, or other ambient state, so secrets cannot leak
 * into telemetry by default.
 */
export function buildSentryEventPayload(input: {
  error: unknown;
  level: "error" | "warning";
  environment: string;
  release?: string;
  context?: SentryEventContext;
  timestamp: Date;
}): Record<string, unknown> {
  const error = input.error instanceof Error ? input.error : null;
  const message = error ? error.message : String(input.error);

  return {
    timestamp: input.timestamp.toISOString(),
    platform: "node",
    level: input.level,
    environment: input.environment,
    ...(input.release ? { release: input.release } : {}),
    exception: {
      values: [
        {
          type: error?.name ?? "Error",
          value: message,
          ...(error?.stack ? { stacktrace: { frames: [], raw: error.stack } } : {})
        }
      ]
    },
    extra: input.context ?? {}
  };
}

/**
 * Creates a dependency-free Sentry reporter that posts envelopes over HTTP.
 * Reporting is disabled (a no-op) without a valid DSN and always fails open:
 * telemetry problems never break the calling request or job.
 */
export function createSentryReporter(input: CreateSentryReporterInput): SentryReporter {
  const parts = input.dsn ? parseSentryDsn(input.dsn) : null;

  if (!parts) {
    return {
      enabled: false,
      async captureException() {},
      async captureMessage() {}
    };
  }

  const fetchFn: FetchLike = input.fetchFn ?? ((url, init) => fetch(url, init));
  const now = input.now ?? (() => new Date());
  const environment = input.environment ?? "development";
  const url = buildSentryEnvelopeUrl(parts);

  const send = async (payload: Record<string, unknown>): Promise<void> => {
    const envelopeHeader = JSON.stringify({
      sent_at: now().toISOString(),
      dsn: `${parts.protocol}://${parts.publicKey}@${parts.host}/${parts.projectId}`
    });
    const itemHeader = JSON.stringify({ type: "event" });
    const body = `${envelopeHeader}\n${itemHeader}\n${JSON.stringify(payload)}`;

    try {
      await fetchFn(url, {
        method: "POST",
        headers: {
          "content-type": "application/x-sentry-envelope"
        },
        body
      });
    } catch (error) {
      input.onError?.(error);
    }
  };

  return {
    enabled: true,
    async captureException(error, context) {
      await send(
        buildSentryEventPayload({
          error,
          level: "error",
          environment,
          release: input.release,
          context,
          timestamp: now()
        })
      );
    },
    async captureMessage(message, context) {
      await send(
        buildSentryEventPayload({
          error: message,
          level: "warning",
          environment,
          release: input.release,
          context,
          timestamp: now()
        })
      );
    }
  };
}
