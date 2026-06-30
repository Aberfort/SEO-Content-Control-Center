import type { ZodError } from "zod";

export function jsonError(status: number, code: string, message: string, details?: unknown) {
  return Response.json({ error: { code, message, details } }, { status });
}

export function validationError(error: ZodError) {
  return jsonError(422, "VALIDATION_ERROR", "The request payload is invalid.", error.flatten());
}
