import { getAppRepository } from "@/lib/app-repository";
import { getCurrentUser } from "@/lib/auth";
import { assertRequestSameOrigin } from "@/lib/csrf";
import { syncGscDailyMetricsForSite } from "@/lib/gsc-metrics";
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
  const propertyUrl = new URL(request.url).searchParams.get("propertyUrl")?.trim() || undefined;
  const repository = getAppRepository();

  try {
    const metrics = await repository.listGscDailyMetrics(
      user.id,
      organizationId,
      siteId,
      propertyUrl
    );

    return Response.json({
      data: {
        siteId,
        propertyUrl: propertyUrl ?? null,
        metrics
      }
    });
  } catch (error) {
    const response = gscMetricsError(error);

    if (response) {
      return response;
    }

    return jsonError(400, "GSC_METRICS_FAILED", "Could not list Search Console metrics.");
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
    };
    const result = await syncGscDailyMetricsForSite({
      user,
      organizationId,
      siteId,
      startDate: typeof body.startDate === "string" ? body.startDate : undefined,
      endDate: typeof body.endDate === "string" ? body.endDate : undefined
    });

    return Response.json({ data: result }, { status: 201 });
  } catch (error) {
    const response = gscMetricsError(error);

    if (response) {
      return response;
    }

    return jsonError(400, "GSC_METRICS_FAILED", "Could not sync Search Console metrics.");
  }
}

function gscMetricsError(error: unknown): Response | null {
  if (!(error instanceof Error)) {
    return null;
  }

  if (error.message.startsWith("Role ")) {
    return jsonError(
      403,
      "FORBIDDEN",
      "Your role does not allow syncing Google Search Console metrics."
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
      return jsonError(422, "GSC_METRIC_DATE_RANGE_INVALID", "Metric date range is invalid.");
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
