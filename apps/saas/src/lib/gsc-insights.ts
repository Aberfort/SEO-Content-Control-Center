import { getAppRepository } from "./app-repository";
import { queryGscSearchInsights, refreshGscAccessToken } from "./gsc-oauth";
import { normalizeDateRange } from "./gsc-metrics";
import { decryptSecret } from "./token-encryption";
import type { AppUser, GscSearchInsightSyncResult } from "./types";

type Fetcher = typeof fetch;

const defaultInsightRowLimit = 100;
const maxInsightRowLimit = 25000;

export async function syncGscSearchInsightsForSite(input: {
  user: AppUser;
  organizationId: string;
  siteId: string;
  startDate?: string;
  endDate?: string;
  rowLimit?: number;
  fetcher?: Fetcher;
}): Promise<GscSearchInsightSyncResult> {
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
  const rowLimit = normalizeInsightRowLimit(input.rowLimit);
  const refreshToken = decryptSecret(connection.encryptedRefreshToken);
  const accessToken = await refreshGscAccessToken({
    refreshToken,
    fetcher: input.fetcher
  });
  const rows = await queryGscSearchInsights({
    accessToken,
    propertyUrl: connection.propertyUrl,
    startDate: range.startDate,
    endDate: range.endDate,
    rowLimit,
    fetcher: input.fetcher
  });

  return repository.replaceGscSearchInsights({
    user: input.user,
    organizationId: input.organizationId,
    siteId: input.siteId,
    propertyUrl: connection.propertyUrl,
    startDate: range.startDate,
    endDate: range.endDate,
    insights: rows
  });
}

export function normalizeInsightRowLimit(rowLimit?: number | null): number {
  if (!Number.isFinite(rowLimit)) {
    return defaultInsightRowLimit;
  }

  return Math.max(1, Math.min(maxInsightRowLimit, Math.floor(rowLimit ?? defaultInsightRowLimit)));
}
