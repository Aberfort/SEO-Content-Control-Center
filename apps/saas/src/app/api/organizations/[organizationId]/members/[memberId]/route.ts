import { ZodError } from "zod";

import { getAppRepository } from "@/lib/app-repository";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, unauthorizedError, validationError } from "@/lib/http";

type RouteContext = {
  params: Promise<{
    organizationId: string;
    memberId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorizedError();
  }

  const { organizationId, memberId } = await context.params;
  const repository = getAppRepository();

  try {
    const body = (await request.json()) as unknown;
    const member = await repository.updateMemberRole({
      user,
      organizationId,
      memberId,
      role: readString(body, "role") as never
    });

    return Response.json({ data: member });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(error);
    }

    if (error instanceof Error && error.message === "MEMBER_NOT_FOUND") {
      return jsonError(404, "MEMBER_NOT_FOUND", "Member was not found.");
    }

    if (error instanceof Error && error.message === "CANNOT_CHANGE_OWN_ROLE") {
      return jsonError(409, "CANNOT_CHANGE_OWN_ROLE", "You cannot change your own role.");
    }

    if (error instanceof Error && error.message === "OWNER_ROLE_IS_PROTECTED") {
      return jsonError(
        409,
        "OWNER_ROLE_IS_PROTECTED",
        "Owner role changes require ownership transfer."
      );
    }

    if (error instanceof Error && error.message.startsWith("Role ")) {
      return jsonError(403, "FORBIDDEN", "Your role does not allow managing members.");
    }

    return jsonError(404, "ORGANIZATION_NOT_FOUND", "Organization was not found.");
  }
}

function readString(input: unknown, key: string): string {
  if (typeof input !== "object" || input === null || !(key in input)) {
    return "";
  }

  const value = (input as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}
