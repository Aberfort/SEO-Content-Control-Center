import { assistantRecommendationListQuerySchema } from "@sccc/shared";
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
    const url = new URL(request.url);
    const query = assistantRecommendationListQuerySchema.parse({
      limit: url.searchParams.get("limit") ?? undefined
    });
    const recommendationList = await repository.listAssistantRecommendationsForSite(
      user.id,
      organizationId,
      siteId,
      query
    );

    return Response.json({ data: recommendationList });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(error);
    }

    if (error instanceof Error && error.message === "SITE_NOT_FOUND") {
      return jsonError(404, "SITE_NOT_FOUND", "Site was not found.");
    }

    if (error instanceof Error && error.message.startsWith("Role ")) {
      return jsonError(
        403,
        "FORBIDDEN",
        "Your role does not allow reading assistant recommendations."
      );
    }

    return jsonError(404, "ORGANIZATION_NOT_FOUND", "Organization was not found.");
  }
}
