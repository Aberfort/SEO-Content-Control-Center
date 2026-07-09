import { getAppRepository } from "@/lib/app-repository";
import { getCurrentUser } from "@/lib/auth";
import {
  buildGscAuthorizationUrl,
  buildGscDashboardReturnUrl,
  createGscOAuthState
} from "@/lib/gsc-oauth";

type RouteContext = {
  params: Promise<{
    organizationId: string;
    siteId: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const requestUrl = new URL(request.url);
  const { organizationId, siteId } = await context.params;
  const propertyUrl = requestUrl.searchParams.get("propertyUrl")?.trim() ?? "";
  const user = await getCurrentUser();

  if (!user) {
    return redirectToDashboard(
      requestUrl,
      siteId,
      "Please sign in before connecting Search Console."
    );
  }

  if (!propertyUrl) {
    return redirectToDashboard(
      requestUrl,
      siteId,
      "Google Search Console property URL is required."
    );
  }

  try {
    const repository = getAppRepository();
    const overview = await repository.getGscConnectionOverviewForSite(
      user.id,
      organizationId,
      siteId
    );

    if (!overview.action.enabled) {
      return redirectToDashboard(
        requestUrl,
        siteId,
        overview.action.disabledReason ?? "Google Search Console OAuth is not available."
      );
    }

    if (propertyUrl !== readActionPropertyUrl(overview.action.href, requestUrl.origin)) {
      return redirectToDashboard(
        requestUrl,
        siteId,
        "Google Search Console property URL must match the selected site."
      );
    }

    const state = createGscOAuthState({
      userId: user.id,
      organizationId,
      siteId,
      propertyUrl
    });

    return Response.redirect(buildGscAuthorizationUrl({ state }), 303);
  } catch (error) {
    return redirectToDashboard(requestUrl, siteId, formatGscOAuthStartError(error));
  }
}

function redirectToDashboard(requestUrl: URL, siteId: string, message: string): Response {
  return Response.redirect(
    buildGscDashboardReturnUrl({
      origin: requestUrl.origin,
      siteId,
      status: "error",
      message
    }),
    303
  );
}

function formatGscOAuthStartError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message === "SITE_NOT_FOUND") {
      return "Site was not found.";
    }

    if (error.message.startsWith("Role ")) {
      return "Your role can not manage Google Search Console connections.";
    }

    if (error.message === "GSC_OAUTH_STATE_SECRET_NOT_CONFIGURED") {
      return "Google Search Console OAuth state signing is not configured.";
    }

    if (error.message === "GSC_OAUTH_NOT_CONFIGURED") {
      return "Google Search Console OAuth is not configured.";
    }
  }

  return "Could not start Google Search Console OAuth.";
}

function readActionPropertyUrl(href: string | null, origin: string): string | null {
  if (!href) {
    return null;
  }

  return new URL(href, origin).searchParams.get("propertyUrl");
}
