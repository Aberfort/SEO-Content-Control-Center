import { getAppRepository } from "@/lib/app-repository";
import { getCurrentUser } from "@/lib/auth";
import {
  buildGscDashboardReturnUrl,
  exchangeGscAuthorizationCode,
  fetchGscGoogleAccountEmail,
  parseGscOAuthState
} from "@/lib/gsc-oauth";
import { encryptSecret } from "@/lib/token-encryption";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code")?.trim() ?? "";
  const stateValue = requestUrl.searchParams.get("state")?.trim() ?? "";
  const providerError = requestUrl.searchParams.get("error")?.trim() ?? "";
  let siteId: string | null = null;

  try {
    if (providerError) {
      throw new Error("GSC_OAUTH_ACCESS_DENIED");
    }

    if (!code || !stateValue) {
      throw new Error("GSC_OAUTH_CALLBACK_INVALID");
    }

    const state = parseGscOAuthState(stateValue);
    siteId = state.siteId;
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("AUTH_REQUIRED");
    }

    if (user.id !== state.userId) {
      throw new Error("GSC_OAUTH_STATE_USER_MISMATCH");
    }

    const tokens = await exchangeGscAuthorizationCode({ code });
    const googleAccountEmail = await fetchGscGoogleAccountEmail({
      accessToken: tokens.accessToken
    });
    const encryptedRefreshToken = encryptSecret(tokens.refreshToken);
    const repository = getAppRepository();

    await repository.upsertGscConnection({
      user,
      organizationId: state.organizationId,
      siteId: state.siteId,
      googleAccountEmail,
      propertyUrl: state.propertyUrl,
      encryptedRefreshToken
    });

    return Response.redirect(
      buildGscDashboardReturnUrl({
        origin: requestUrl.origin,
        siteId: state.siteId,
        status: "connected"
      }),
      303
    );
  } catch (error) {
    return Response.redirect(
      buildGscDashboardReturnUrl({
        origin: requestUrl.origin,
        siteId,
        status: "error",
        message: formatGscOAuthCallbackError(error)
      }),
      303
    );
  }
}

function formatGscOAuthCallbackError(error: unknown): string {
  if (error instanceof Error) {
    switch (error.message) {
      case "AUTH_REQUIRED":
        return "Please sign in before completing Search Console connection.";
      case "GSC_OAUTH_ACCESS_DENIED":
        return "Google Search Console access was not granted.";
      case "GSC_OAUTH_CALLBACK_INVALID":
      case "GSC_OAUTH_STATE_INVALID":
      case "GSC_OAUTH_STATE_USER_MISMATCH":
        return "Google Search Console OAuth state is invalid.";
      case "GSC_OAUTH_STATE_EXPIRED":
        return "Google Search Console OAuth state expired. Please try again.";
      case "GSC_OAUTH_NOT_CONFIGURED":
        return "Google Search Console OAuth is not configured.";
      case "GSC_TOKEN_EXCHANGE_FAILED":
        return "Could not exchange Google Search Console OAuth code.";
      case "GSC_REFRESH_TOKEN_MISSING":
        return "Google did not return a refresh token. Please revoke access and reconnect.";
      case "GSC_USERINFO_FAILED":
        return "Could not read the connected Google account email.";
      case "TOKEN_ENCRYPTION_KEY_NOT_CONFIGURED":
        return "Token encryption key is not configured.";
      case "SITE_NOT_FOUND":
        return "Site was not found.";
      default:
        if (error.message.startsWith("Role ")) {
          return "Your role can not manage Google Search Console connections.";
        }
    }
  }

  return "Could not complete Google Search Console connection.";
}
