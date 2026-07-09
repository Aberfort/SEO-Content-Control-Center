import { ZodError } from "zod";

import { assertRequestSameOrigin } from "@/lib/csrf";
import { sendPasswordResetEmail } from "@/lib/email";
import { jsonError, securityError, validationError } from "@/lib/http";
import { createPasswordResetRequest } from "@/lib/password-reset";
import { assertRateLimit, rateLimitKeyFromHeaders } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    assertRequestSameOrigin(request);
    const body = (await request.json()) as unknown;
    const email = readString(body, "email");

    await assertRateLimit("auth-password-reset", rateLimitKeyFromHeaders(request.headers, email));
    const reset = await createPasswordResetRequest({
      email
    });

    if (reset) {
      await sendPasswordResetEmail({
        to: reset.email,
        name: reset.name,
        resetUrl: reset.resetUrl,
        expiresAt: reset.expiresAt
      });
    }

    return Response.json({
      data: {
        accepted: true
      }
    });
  } catch (error) {
    const response = securityError(error);

    if (response) {
      return response;
    }

    if (error instanceof ZodError) {
      return validationError(error);
    }

    return jsonError(400, "PASSWORD_RESET_REQUEST_FAILED", "Could not start password reset.");
  }
}

function readString(input: unknown, key: string): string {
  if (typeof input !== "object" || input === null || !(key in input)) {
    return "";
  }

  const value = (input as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}
