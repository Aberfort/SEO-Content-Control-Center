import { ZodError } from "zod";

import { getAppRepository } from "@/lib/app-repository";
import { getCurrentUser } from "@/lib/auth";
import { assertRequestSameOrigin } from "@/lib/csrf";
import { jsonError, securityError, unauthorizedError, validationError } from "@/lib/http";
import { hashInviteToken } from "@/lib/invite-token";
import { assertRateLimit, rateLimitKeyFromHeaders } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    assertRequestSameOrigin(request);
  } catch (error) {
    const response = securityError(error);

    if (response) {
      return response;
    }

    throw error;
  }

  const user = await getCurrentUser();

  if (!user) {
    return unauthorizedError();
  }

  try {
    const body = (await request.json()) as unknown;
    const token = readString(body, "token");
    assertRateLimit(
      "invite-accept",
      rateLimitKeyFromHeaders(request.headers, hashInviteToken(token))
    );
    const repository = getAppRepository();
    const member = await repository.acceptInvite({
      user,
      token
    });

    return Response.json({ data: member });
  } catch (error) {
    const response = securityError(error);

    if (response) {
      return response;
    }

    if (error instanceof ZodError) {
      return validationError(error);
    }

    if (error instanceof Error && error.message === "INVITE_NOT_FOUND") {
      return jsonError(404, "INVITE_NOT_FOUND", "Invite link was not found.");
    }

    if (error instanceof Error && error.message === "INVITE_EXPIRED") {
      return jsonError(410, "INVITE_EXPIRED", "Invite link has expired.");
    }

    if (error instanceof Error && error.message === "INVITE_NOT_PENDING") {
      return jsonError(409, "INVITE_NOT_PENDING", "This invite is no longer pending.");
    }

    if (error instanceof Error && error.message === "INVITE_EMAIL_MISMATCH") {
      return jsonError(403, "INVITE_EMAIL_MISMATCH", "Sign in with the invited email address.");
    }

    return jsonError(400, "ACCEPT_INVITE_FAILED", "Could not accept invite.");
  }
}

function readString(input: unknown, key: string): string {
  if (typeof input !== "object" || input === null || !(key in input)) {
    return "";
  }

  const value = (input as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}
