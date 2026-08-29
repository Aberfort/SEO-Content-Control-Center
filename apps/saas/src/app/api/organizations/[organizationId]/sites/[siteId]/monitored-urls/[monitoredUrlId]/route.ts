import { ZodError } from "zod";

import { getAppRepository } from "@/lib/app-repository";
import { getCurrentUser } from "@/lib/auth";
import { assertRequestSameOrigin } from "@/lib/csrf";
import { jsonError, securityError, unauthorizedError, validationError } from "@/lib/http";

type RouteContext = {
  params: Promise<{
    organizationId: string;
    siteId: string;
    monitoredUrlId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
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
    const body = (await request.json()) as Record<string, unknown>;
    const monitoredUrl = await repository.updateMonitoredUrlStatus({
      user,
      organizationId,
      siteId,
      monitoredUrlId,
      isActive: body.isActive as boolean
    });

    return Response.json({ data: monitoredUrl });
  } catch (error) {
    const response = securityError(error);

    if (response) {
      return response;
    }

    if (error instanceof ZodError) {
      return validationError(error);
    }

    if (error instanceof Error && error.message === "MONITORED_URL_NOT_FOUND") {
      return jsonError(404, "MONITORED_URL_NOT_FOUND", "Monitored URL was not found.");
    }

    if (error instanceof Error && error.message === "MONITORED_URL_LIMIT_REACHED") {
      return jsonError(
        409,
        "MONITORED_URL_LIMIT_REACHED",
        "Resuming this URL would exceed the active monitored URL limit for this site."
      );
    }

    if (error instanceof Error && error.message.startsWith("Role ")) {
      return jsonError(403, "FORBIDDEN", "Your role does not allow updating monitored URLs.");
    }

    return jsonError(404, "ORGANIZATION_NOT_FOUND", "Organization was not found.");
  }
}
