import { ZodError } from "zod";

import { getAppRepository } from "@/lib/app-repository";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, unauthorizedError, validationError } from "@/lib/http";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorizedError();
  }

  const repository = getAppRepository();

  try {
    const body = (await request.json()) as unknown;
    const member = await repository.acceptInvite({
      user,
      token: readString(body, "token")
    });

    return Response.json({ data: member });
  } catch (error) {
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
