import { eventListQuerySchema } from "@sccc/shared";
import { ZodError } from "zod";

import { getAppRepository } from "@/lib/app-repository";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, unauthorizedError, validationError } from "@/lib/http";

type RouteContext = {
  params: Promise<{
    organizationId: string;
    siteId: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorizedError();
  }

  const { organizationId, siteId } = await context.params;
  const repository = getAppRepository();

  try {
    const query = eventListQuerySchema.parse({
      monitoredUrlId: readSearchParam(request, "monitoredUrlId") || undefined,
      source: readSearchParam(request, "source") || undefined,
      severity: readSearchParam(request, "severity") || undefined,
      limit: readSearchParam(request, "limit") || undefined
    });
    const events = await repository.listEventsForSite(user.id, organizationId, siteId, query);

    return Response.json({ data: events });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(error);
    }

    if (error instanceof Error && error.message === "SITE_NOT_FOUND") {
      return jsonError(404, "SITE_NOT_FOUND", "Site was not found.");
    }

    if (error instanceof Error && error.message.startsWith("Role ")) {
      return jsonError(403, "FORBIDDEN", "Your role does not allow reading the site timeline.");
    }

    return jsonError(404, "ORGANIZATION_NOT_FOUND", "Organization was not found.");
  }
}

function readSearchParam(request: Request, key: string): string {
  return new URL(request.url).searchParams.get(key) ?? "";
}
