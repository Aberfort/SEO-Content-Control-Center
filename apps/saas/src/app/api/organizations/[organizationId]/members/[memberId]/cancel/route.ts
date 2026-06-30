import { getAppRepository } from "@/lib/app-repository";
import { getCurrentUser } from "@/lib/auth";
import { assertRequestSameOrigin } from "@/lib/csrf";
import { jsonError, securityError, unauthorizedError } from "@/lib/http";

type RouteContext = {
  params: Promise<{
    organizationId: string;
    memberId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
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

  const { organizationId, memberId } = await context.params;
  const repository = getAppRepository();

  try {
    const member = await repository.cancelInvite({
      user,
      organizationId,
      memberId
    });

    return Response.json({ data: member });
  } catch (error) {
    const response = securityError(error);

    if (response) {
      return response;
    }

    if (error instanceof Error && error.message === "MEMBER_NOT_FOUND") {
      return jsonError(404, "MEMBER_NOT_FOUND", "Member was not found.");
    }

    if (error instanceof Error && error.message === "INVITE_NOT_PENDING") {
      return jsonError(409, "INVITE_NOT_PENDING", "This invite is no longer pending.");
    }

    if (error instanceof Error && error.message.startsWith("Role ")) {
      return jsonError(403, "FORBIDDEN", "Your role does not allow canceling invites.");
    }

    return jsonError(404, "ORGANIZATION_NOT_FOUND", "Organization was not found.");
  }
}
