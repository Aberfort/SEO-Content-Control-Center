import { getAppRepository } from "./app-repository";
import { listGscProperties, refreshGscAccessToken } from "./gsc-oauth";
import { decryptSecret } from "./token-encryption";
import type { AppUser, GscPropertySelectionResult, GscPropertySummary } from "./types";

type Fetcher = typeof fetch;

export async function selectGscPropertyForSite(input: {
  user: AppUser;
  organizationId: string;
  siteId: string;
  propertyUrl: string;
  fetcher?: Fetcher;
}): Promise<GscPropertySelectionResult> {
  const propertyUrl = input.propertyUrl.trim();

  if (!propertyUrl) {
    throw new Error("GSC_PROPERTY_SELECTION_INVALID");
  }

  const repository = getAppRepository();
  const connection = await repository.getGscConnectionSecretForSite(
    input.user.id,
    input.organizationId,
    input.siteId
  );

  if (!connection) {
    throw new Error("GSC_CONNECTION_NOT_FOUND");
  }

  const refreshToken = decryptSecret(connection.encryptedRefreshToken);
  const accessToken = await refreshGscAccessToken({
    refreshToken,
    fetcher: input.fetcher
  });
  const properties = await listGscProperties({
    accessToken,
    fetcher: input.fetcher
  });
  const selectedProperty = properties.find((property) => property.siteUrl === propertyUrl);

  if (!selectedProperty) {
    throw new Error("GSC_PROPERTY_NOT_ACCESSIBLE");
  }

  const selectedConnection = await repository.selectGscConnectionProperty({
    user: input.user,
    organizationId: input.organizationId,
    siteId: input.siteId,
    googleAccountEmail: connection.googleAccountEmail,
    propertyUrl: selectedProperty.siteUrl,
    encryptedRefreshToken: connection.encryptedRefreshToken
  });

  return {
    siteId: input.siteId,
    connectedPropertyUrl: selectedProperty.siteUrl,
    connection: selectedConnection,
    properties: markSelectedProperty(properties, selectedProperty.siteUrl)
  };
}

function markSelectedProperty(properties: GscPropertySummary[], propertyUrl: string) {
  return properties.map((property) => ({
    ...property,
    selected: property.siteUrl === propertyUrl
  }));
}
