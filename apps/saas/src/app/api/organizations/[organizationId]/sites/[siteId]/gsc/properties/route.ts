import { getAppRepository } from "@/lib/app-repository";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, unauthorizedError } from "@/lib/http";
import { listGscProperties, refreshGscAccessToken } from "@/lib/gsc-oauth";
import { decryptSecret } from "@/lib/token-encryption";

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
    const connection = await repository.getGscConnectionSecretForSite(
      user.id,
      organizationId,
      siteId
    );

    if (!connection) {
      return jsonError(
        409,
        "GSC_CONNECTION_NOT_FOUND",
        "Google Search Console is not connected for this site."
      );
    }

    const refreshToken = decryptSecret(connection.encryptedRefreshToken);
    const accessToken = await refreshGscAccessToken({ refreshToken });
    const properties = await listGscProperties({ accessToken });

    return Response.json({
      data: {
        siteId,
        connectedPropertyUrl: connection.propertyUrl,
        properties: properties.map((property) => ({
          ...property,
          selected: property.siteUrl === connection.propertyUrl
        }))
      }
    });
  } catch (error) {
    const response = gscPropertiesError(error);

    if (response) {
      return response;
    }

    return jsonError(400, "GSC_PROPERTIES_FAILED", "Could not list Search Console properties.");
  }
}

function gscPropertiesError(error: unknown): Response | null {
  if (!(error instanceof Error)) {
    return null;
  }

  if (error.message.startsWith("Role ")) {
    return jsonError(
      403,
      "FORBIDDEN",
      "Your role does not allow managing Google Search Console connections."
    );
  }

  switch (error.message) {
    case "SITE_NOT_FOUND":
      return jsonError(404, "SITE_NOT_FOUND", "Site was not found.");
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
    case "GSC_PROPERTIES_LIST_FAILED":
      return jsonError(
        502,
        "GSC_PROPERTIES_LIST_FAILED",
        "Could not list Google Search Console properties."
      );
    default:
      return null;
  }
}
