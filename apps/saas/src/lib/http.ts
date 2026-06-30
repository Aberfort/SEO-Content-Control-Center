import type { ZodError } from "zod";

import { isCsrfError } from "./csrf";
import { isRateLimitError } from "./rate-limit";

export function jsonError(status: number, code: string, message: string, details?: unknown) {
  return Response.json({ error: { code, message, details } }, { status });
}

export function validationError(error: ZodError) {
  return jsonError(422, "VALIDATION_ERROR", "The request payload is invalid.", error.flatten());
}

export function unauthorizedError() {
  return jsonError(401, "AUTH_REQUIRED", "Please sign in before continuing.");
}

export function securityError(error: unknown): Response | null {
  if (isCsrfError(error)) {
    return jsonError(403, "CSRF_INVALID", "Request origin is not allowed.");
  }

  if (isRateLimitError(error)) {
    return Response.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: "Too many attempts. Please try again later."
        }
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(error.retryAfterSeconds)
        }
      }
    );
  }

  return null;
}
