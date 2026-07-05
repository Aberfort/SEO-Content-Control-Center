import { getAppRepository } from "@/lib/app-repository";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, unauthorizedError } from "@/lib/http";

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
    const billing = await repository.getBillingOverviewForOrganization(user.id, organizationId);
    return Response.json({ data: billing });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Role ")) {
      return jsonError(403, "FORBIDDEN", "Your role does not allow reading billing.");
    }

    return jsonError(404, "ORGANIZATION_NOT_FOUND", "Organization was not found.");
  }
}
