import { getAppRepository } from "@/lib/app-repository";
import { getCurrentUser } from "@/lib/auth";
import {
  buildGscOpportunities,
  buildGscOpportunityCandidateId,
  matchGscOpportunityEntries
} from "@/lib/gsc-opportunities";
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
    const insights = await repository.listGscSearchInsights(user.id, organizationId, siteId, {
      propertyUrl
    });
    const opportunities = buildGscOpportunities(insights);
    const contentUrls =
      opportunities.entries.length > 0
        ? await repository.listSyncedContentUrlsForSite(user.id, organizationId, siteId)
        : [];
    const entries = matchGscOpportunityEntries(opportunities.entries, contentUrls).map((entry) => ({
      ...entry,
      candidateId: entry.content
        ? buildGscOpportunityCandidateId(entry.content.contentItemId, entry.type)
        : null
    }));

    return Response.json({
      data: {
        siteId,
        propertyUrl: propertyUrl ?? insights[0]?.propertyUrl ?? null,
        available: opportunities.available,
        reason: opportunities.reason,
        range: opportunities.range,
        entries
      }
    });
  } catch (error) {
    const response = opportunitiesError(error);

    if (response) {
      return response;
    }

    return jsonError(400, "GSC_OPPORTUNITIES_FAILED", "Could not compute search opportunities.");
  }
}

function opportunitiesError(error: unknown): Response | null {
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
