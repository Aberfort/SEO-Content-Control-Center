import { ZodError } from "zod";

import { getAppRepository } from "@/lib/app-repository";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, unauthorizedError, validationError } from "@/lib/http";

type RouteContext = {
  params: Promise<{
    organizationId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorizedError();
  }

  const { organizationId } = await context.params;
  const repository = getAppRepository();

  try {
    return Response.json({
      data: await repository.listMembersForOrganization(user.id, organizationId)
    });
  } catch {
    return jsonError(404, "ORGANIZATION_NOT_FOUND", "Organization was not found.");
  }
}

export async function POST(request: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorizedError();
  }

  const { organizationId } = await context.params;
  const repository = getAppRepository();

  try {
    const body = (await request.json()) as unknown;
    const invite = await repository.inviteMember({
      user,
      organizationId,
      email: readString(body, "email"),
      role: readString(body, "role") as never
    });

    return Response.json({ data: invite }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(error);
    }

    if (error instanceof Error && error.message === "MEMBER_ALREADY_EXISTS") {
      return jsonError(409, "MEMBER_ALREADY_EXISTS", "This user is already a member.");
    }

    if (error instanceof Error && error.message.startsWith("Role ")) {
      return jsonError(403, "FORBIDDEN", "Your role does not allow inviting members.");
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
