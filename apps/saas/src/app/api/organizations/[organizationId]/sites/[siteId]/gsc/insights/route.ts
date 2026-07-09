import { getAppRepository } from "@/lib/app-repository";
import { getCurrentUser } from "@/lib/auth";
import { assertRequestSameOrigin } from "@/lib/csrf";
import { syncGscSearchInsightsForSite } from "@/lib/gsc-insights";
import { jsonError, securityError, unauthorizedError } from "@/lib/http";

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
  const searchParams = new URL(request.url).searchParams;
  const propertyUrl = searchParams.get("propertyUrl")?.trim() || undefined;
  const startDate = searchParams.get("startDate")?.trim() || undefined;
  const endDate = searchParams.get("endDate")?.trim() || undefined;
  const limit = readPositiveInteger(searchParams.get("limit"));

  if ((startDate && !endDate) || (!startDate && endDate)) {
    return jsonError(
      422,
      "GSC_INSIGHT_DATE_RANGE_INVALID",
      "Insight date range must include both startDate and endDate."
    );
  }

  const repository = getAppRepository();

  try {
    const insights = await repository.listGscSearchInsights(user.id, organizationId, siteId, {
      propertyUrl,
      startDate,
      endDate,
      limit
    });

    return Response.json({
      data: {
        siteId,
        propertyUrl: propertyUrl ?? null,
        startDate: startDate ?? null,
        endDate: endDate ?? null,
        insights
      }
    });
  } catch (error) {
    const response = gscInsightsError(error);

    if (response) {
      return response;
    }

    return jsonError(400, "GSC_INSIGHTS_FAILED", "Could not list Search Console insights.");
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

  try {
    const body = (await request.json()) as {
      startDate?: unknown;
      endDate?: unknown;
      rowLimit?: unknown;
    };
    const result = await syncGscSearchInsightsForSite({
      user,
      organizationId,
      siteId,
      startDate: typeof body.startDate === "string" ? body.startDate : undefined,
      endDate: typeof body.endDate === "string" ? body.endDate : undefined,
      rowLimit: typeof body.rowLimit === "number" ? body.rowLimit : undefined
    });

    return Response.json({ data: result }, { status: 201 });
  } catch (error) {
    const response = gscInsightsError(error);

    if (response) {
      return response;
    }

    return jsonError(400, "GSC_INSIGHTS_FAILED", "Could not sync Search Console insights.");
  }
}

function gscInsightsError(error: unknown): Response | null {
  if (!(error instanceof Error)) {
    return null;
  }

  if (error.message.startsWith("Role ")) {
    return jsonError(
      403,
      "FORBIDDEN",
      "Your role does not allow syncing Google Search Console insights."
    );
  }

  switch (error.message) {
    case "SITE_NOT_FOUND":
      return jsonError(404, "SITE_NOT_FOUND", "Site was not found.");
    case "GSC_CONNECTION_NOT_FOUND":
      return jsonError(
        409,
        "GSC_CONNECTION_NOT_FOUND",
        "Google Search Console is not connected for this site."
      );
    case "GSC_METRIC_DATE_RANGE_INVALID":
      return jsonError(422, "GSC_INSIGHT_DATE_RANGE_INVALID", "Insight date range is invalid.");
    case "TOKEN_ENCRYPTION_KEY_NOT_CONFIGURED":
    case "TOKEN_ENCRYPTION_PAYLOAD_INVALID":
      return jsonError(
        503,
        "TOKEN_ENCRYPTION_NOT_CONFIGURED",
        "Token encryption is not configured correctly."
      );
    case "GSC_OAUTH_NOT_CONFIGURED":
      return jsonError(
        503,
        "GSC_OAUTH_NOT_CONFIGURED",
        "Google Search Console OAuth is not configured."
      );
    case "GSC_TOKEN_REFRESH_FAILED":
      return jsonError(
        502,
        "GSC_TOKEN_REFRESH_FAILED",
        "Could not refresh Google Search Console access."
      );
    case "GSC_SEARCH_ANALYTICS_FAILED":
      return jsonError(
        502,
        "GSC_SEARCH_ANALYTICS_FAILED",
        "Could not query Search Console analytics."
      );
    default:
      return null;
  }
}

function readPositiveInteger(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return undefined;
  }

  return Math.floor(parsed);
}
