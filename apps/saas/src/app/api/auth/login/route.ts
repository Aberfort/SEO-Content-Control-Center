import { ZodError } from "zod";

import { loginWithPassword } from "@/lib/auth";
import { assertRequestSameOrigin } from "@/lib/csrf";
import { jsonError, securityError, validationError } from "@/lib/http";
import { assertRateLimit, rateLimitKeyFromHeaders } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    assertRequestSameOrigin(request);
    const body = (await request.json()) as unknown;
    await assertRateLimit(
      "auth-login",
      rateLimitKeyFromHeaders(request.headers, readString(body, "email"))
    );
    const user = await loginWithPassword(body);
    return Response.json({ data: user });
  } catch (error) {
    const response = securityError(error);

    if (response) {
      return response;
    }

    if (error instanceof ZodError) {
      return validationError(error);
    }

    if (error instanceof Error && error.message === "INVALID_CREDENTIALS") {
      return jsonError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
    }

    return jsonError(400, "LOGIN_FAILED", "Could not sign in.");
  }
}

function readString(input: unknown, key: string): string {
  if (typeof input !== "object" || input === null || !(key in input)) {
    return "";
  }

  const value = (input as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}
