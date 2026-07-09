import { getAppRepository } from "@/lib/app-repository";
import { getCurrentUser } from "@/lib/auth";
import { matchTrafficLossPages } from "@/lib/gsc-content-matching";
import { buildPageTrafficLoss, buildSiteTrafficLoss, shiftDateOnly } from "@/lib/gsc-traffic-loss";
import { jsonError, unauthorizedError } from "@/lib/http";

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
  const propertyUrl = new URL(request.url).searchParams.get("propertyUrl")?.trim() || undefined;
  const repository = getAppRepository();

  try {
    const metrics = await repository.listGscDailyMetrics(
      user.id,
      organizationId,
      siteId,
      propertyUrl
    );
    const currentInsights = await repository.listGscSearchInsights(
      user.id,
      organizationId,
      siteId,
      {
        propertyUrl
      }
    );
    const baselineInsights =
      currentInsights.length > 0
        ? await repository.listGscSearchInsights(user.id, organizationId, siteId, {
            propertyUrl,
            startDate: shiftDateOnly(currentInsights[0]!.startDate, -7),
            endDate: shiftDateOnly(currentInsights[0]!.endDate, -7)
          })
        : [];
    const pages = buildPageTrafficLoss(currentInsights, baselineInsights);
    const contentUrls =
      pages.drops.length > 0
        ? await repository.listSyncedContentUrlsForSite(user.id, organizationId, siteId)
        : [];

    return Response.json({
      data: {
        siteId,
        propertyUrl: propertyUrl ?? null,
        site: buildSiteTrafficLoss(metrics),
        pages: {
          ...pages,
          drops: matchTrafficLossPages(pages.drops, contentUrls)
        }
      }
    });
  } catch (error) {
    const response = trafficLossError(error);

    if (response) {
      return response;
    }

    return jsonError(400, "GSC_TRAFFIC_LOSS_FAILED", "Could not compute traffic loss overview.");
  }
}

function trafficLossError(error: unknown): Response | null {
  if (!(error instanceof Error)) {
    return null;
  }

  if (error.message.startsWith("Role ")) {
    return jsonError(
      403,
      "FORBIDDEN",
      "Your role does not allow reading Google Search Console data."
    );
  }

  switch (error.message) {
    case "SITE_NOT_FOUND":
      return jsonError(404, "SITE_NOT_FOUND", "Site was not found.");
    case "ORGANIZATION_NOT_FOUND":
      return jsonError(404, "ORGANIZATION_NOT_FOUND", "Organization was not found.");
    default:
      return null;
  }
}
