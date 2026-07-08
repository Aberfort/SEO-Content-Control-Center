import { ZodError } from "zod";

import { assertRequestSameOrigin } from "@/lib/csrf";
import { jsonError, securityError, validationError } from "@/lib/http";
import { resetPasswordWithToken } from "@/lib/password-reset";
import { assertRateLimit, rateLimitKeyFromHeaders } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    assertRequestSameOrigin(request);
    const body = (await request.json()) as unknown;
    const token = readString(body, "token");

    assertRateLimit("auth-password-reset", rateLimitKeyFromHeaders(request.headers, token));
    const result = await resetPasswordWithToken({
      token,
      password: readString(body, "password")
    });

    return Response.json({ data: result });
  } catch (error) {
    const response = securityError(error);

    if (response) {
      return response;
    }

    if (error instanceof ZodError) {
      return validationError(error);
    }

    if (error instanceof Error && error.message === "PASSWORD_RESET_TOKEN_NOT_FOUND") {
      return jsonError(404, "PASSWORD_RESET_TOKEN_NOT_FOUND", "Password reset link was not found.");
    }

    if (error instanceof Error && error.message === "PASSWORD_RESET_TOKEN_USED") {
      return jsonError(409, "PASSWORD_RESET_TOKEN_USED", "Password reset link was already used.");
    }

    if (error instanceof Error && error.message === "PASSWORD_RESET_TOKEN_EXPIRED") {
      return jsonError(410, "PASSWORD_RESET_TOKEN_EXPIRED", "Password reset link has expired.");
    }

    return jsonError(400, "PASSWORD_RESET_FAILED", "Could not reset password.");
  }
}

function readString(input: unknown, key: string): string {
  if (typeof input !== "object" || input === null || !(key in input)) {
    return "";
  }

  const value = (input as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}
