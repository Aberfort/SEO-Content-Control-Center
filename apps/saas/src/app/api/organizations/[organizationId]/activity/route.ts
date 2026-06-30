import { requireCurrentUser } from "@/lib/auth";
import { listActivityLogsForOrganization } from "@/lib/dev-store";
import { jsonError } from "@/lib/http";

type RouteContext = {
  params: Promise<{
    organizationId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { user } = await requireCurrentUser();
  const { organizationId } = await context.params;

  try {
    return Response.json({ data: listActivityLogsForOrganization(user.id, organizationId) });
  } catch {
    return jsonError(404, "ORGANIZATION_NOT_FOUND", "Organization was not found.");
  }
}
