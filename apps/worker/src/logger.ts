type LogLevel = "info" | "warn" | "error";

type LogContext = Record<string, string | number | boolean | null | undefined>;

/**
 * Structured JSON logging for the worker process. Context values are limited
 * to primitives so tokens, payload bodies, and other sensitive structures are
 * never serialized by accident.
 */
export function logWorkerEvent(level: LogLevel, event: string, context: LogContext = {}): void {
  const entry = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...sanitizeContext(context)
  };

  const line = JSON.stringify(entry);

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}

export function serializeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function sanitizeContext(context: LogContext): LogContext {
  const sanitized: LogContext = {};

  for (const [key, value] of Object.entries(context)) {
    if (value === undefined) {
      continue;
    }

    sanitized[key] = value;
  }

  return sanitized;
}
