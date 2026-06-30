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
    return Response.json({
      data: await repository.listActivityLogsForOrganization(user.id, organizationId)
    });
  } catch {
    return jsonError(404, "ORGANIZATION_NOT_FOUND", "Organization was not found.");
  }
}
