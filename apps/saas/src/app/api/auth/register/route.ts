import { ZodError } from "zod";

import { registerWithPassword } from "@/lib/auth";
import { assertRequestSameOrigin } from "@/lib/csrf";
import { jsonError, securityError, validationError } from "@/lib/http";
import { assertRateLimit, rateLimitKeyFromHeaders } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    assertRequestSameOrigin(request);
    const body = (await request.json()) as unknown;
    assertRateLimit(
      "auth-register",
      rateLimitKeyFromHeaders(request.headers, readString(body, "email"))
    );
    const user = await registerWithPassword(body);
    return Response.json({ data: user }, { status: 201 });
  } catch (error) {
    const response = securityError(error);

    if (response) {
      return response;
    }

    if (error instanceof ZodError) {
      return validationError(error);
    }

    if (error instanceof Error && error.message === "EMAIL_ALREADY_REGISTERED") {
      return jsonError(
        409,
        "EMAIL_ALREADY_REGISTERED",
        "An account with this email already exists."
      );
    }

    return jsonError(400, "REGISTER_FAILED", "Could not create account.");
  }
}

function readString(input: unknown, key: string): string {
  if (typeof input !== "object" || input === null || !(key in input)) {
    return "";
  }

  const value = (input as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}
