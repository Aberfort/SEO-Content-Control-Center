import { normalizeDateRange } from "@sccc/gsc";

import { getAppRepository } from "./app-repository";
import { queryGscDailyMetrics, refreshGscAccessToken } from "./gsc-oauth";
import { decryptSecret } from "./token-encryption";
import type { AppUser, GscMetricSyncResult } from "./types";

export { normalizeDateRange } from "@sccc/gsc";

type Fetcher = typeof fetch;

export async function syncGscDailyMetricsForSite(input: {
  user: AppUser;
  organizationId: string;
  siteId: string;
  startDate?: string;
  endDate?: string;
  fetcher?: Fetcher;
}): Promise<GscMetricSyncResult> {
  const repository = getAppRepository();
  const connection = await repository.getGscConnectionSecretForSite(
    input.user.id,
    input.organizationId,
    input.siteId
  );

  if (!connection) {
    throw new Error("GSC_CONNECTION_NOT_FOUND");
  }

  const range = normalizeDateRange({
    startDate: input.startDate,
    endDate: input.endDate
  });
  const refreshToken = decryptSecret(connection.encryptedRefreshToken);
  const accessToken = await refreshGscAccessToken({
    refreshToken,
    fetcher: input.fetcher
  });
  const rows = await queryGscDailyMetrics({
    accessToken,
    propertyUrl: connection.propertyUrl,
    startDate: range.startDate,
    endDate: range.endDate,
    fetcher: input.fetcher
  });

  return repository.upsertGscDailyMetrics({
    user: input.user,
    organizationId: input.organizationId,
    siteId: input.siteId,
    propertyUrl: connection.propertyUrl,
    startDate: range.startDate,
    endDate: range.endDate,
    metrics: rows
  });
}
