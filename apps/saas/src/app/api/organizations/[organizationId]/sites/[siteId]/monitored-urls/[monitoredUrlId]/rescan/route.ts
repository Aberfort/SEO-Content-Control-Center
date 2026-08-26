import { getAppRepository } from "@/lib/app-repository";
import { getCurrentUser } from "@/lib/auth";
import { assertRequestSameOrigin } from "@/lib/csrf";
import { jsonError, securityError, unauthorizedError } from "@/lib/http";

type RouteContext = {
  params: Promise<{
    organizationId: string;
    siteId: string;
    monitoredUrlId: string;
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

  const { organizationId, siteId, monitoredUrlId } = await context.params;
  const repository = getAppRepository();

  try {
    const monitoredUrl = await repository.rescanMonitoredUrl({
      user,
      organizationId,
      siteId,
      monitoredUrlId
    });

    return Response.json({ data: monitoredUrl });
  } catch (error) {
    if (error instanceof Error && error.message === "MONITORED_URL_NOT_FOUND") {
      return jsonError(404, "MONITORED_URL_NOT_FOUND", "Monitored URL was not found.");
    }

    if (error instanceof Error && error.message.startsWith("Role ")) {
      return jsonError(403, "FORBIDDEN", "Your role does not allow rescanning monitored URLs.");
    }

    return jsonError(404, "ORGANIZATION_NOT_FOUND", "Organization was not found.");
  }
}
