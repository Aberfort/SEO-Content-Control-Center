import { getAppRepository } from "@/lib/app-repository";
import { requireCurrentUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";

type RouteContext = {
  params: Promise<{
    organizationId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { user } = await requireCurrentUser();
  const { organizationId } = await context.params;
  const repository = getAppRepository();

  try {
    const organization = await repository.getOrganizationSummary(user.id, organizationId);

    if (!organization) {
      return jsonError(404, "ORGANIZATION_NOT_FOUND", "Organization was not found.");
    }

    return Response.json({ data: organization });
  } catch {
    return jsonError(404, "ORGANIZATION_NOT_FOUND", "Organization was not found.");
  }
}
