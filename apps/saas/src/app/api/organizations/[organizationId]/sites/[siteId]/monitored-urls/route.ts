import { ZodError } from "zod";

import { getAppRepository } from "@/lib/app-repository";
import { getCurrentUser } from "@/lib/auth";
import { assertRequestSameOrigin } from "@/lib/csrf";
import { jsonError, securityError, unauthorizedError, validationError } from "@/lib/http";
import { assertMonitoringCrawlRateLimit } from "@/lib/monitoring-rate-limit";

type RouteContext = {
  params: Promise<{
    organizationId: string;
    siteId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorizedError();
  }

  const { organizationId, siteId } = await context.params;
  const repository = getAppRepository();

  try {
    const monitoredUrls = await repository.listMonitoredUrlsForSite(user.id, organizationId, siteId);

    return Response.json({ data: monitoredUrls });
  } catch (error) {
    if (error instanceof Error && error.message === "SITE_NOT_FOUND") {
      return jsonError(404, "SITE_NOT_FOUND", "Site was not found.");
    }

    if (error instanceof Error && error.message.startsWith("Role ")) {
      return jsonError(403, "FORBIDDEN", "Your role does not allow reading monitored URLs.");
    }

    return jsonError(404, "ORGANIZATION_NOT_FOUND", "Organization was not found.");
  }
}

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

  const { organizationId, siteId } = await context.params;
  const repository = getAppRepository();

  try {
    await assertMonitoringCrawlRateLimit({
      request,
      userId: user.id,
      organizationId,
      siteId,
      action: "create"
    });
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const monitoredUrl = await repository.createMonitoredUrlForSite({
      user,
      organizationId,
      siteId,
      url: String(body.url ?? ""),
      label: typeof body.label === "string" && body.label.trim() ? body.label : undefined
    });

    return Response.json({ data: monitoredUrl }, { status: 201 });
  } catch (error) {
    const response = securityError(error);

    if (response) {
      return response;
    }

    if (error instanceof ZodError) {
      return validationError(error);
    }

    if (error instanceof Error && error.message === "SITE_NOT_FOUND") {
      return jsonError(404, "SITE_NOT_FOUND", "Site was not found.");
    }

    if (error instanceof Error && error.message === "MONITORED_URL_ALREADY_EXISTS") {
      return jsonError(409, "MONITORED_URL_ALREADY_EXISTS", "This URL is already monitored.");
    }

    if (error instanceof Error && error.message === "MONITORED_URL_LIMIT_REACHED") {
      return jsonError(
        422,
        "MONITORED_URL_LIMIT_REACHED",
        "This site has reached its monitored URL limit."
      );
    }

    if (error instanceof Error && error.message.startsWith("Role ")) {
      return jsonError(403, "FORBIDDEN", "Your role does not allow adding monitored URLs.");
    }

    return jsonError(404, "ORGANIZATION_NOT_FOUND", "Organization was not found.");
  }
}
