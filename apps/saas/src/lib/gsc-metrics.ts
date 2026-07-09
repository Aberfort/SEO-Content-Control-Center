import { getAppRepository } from "./app-repository";
import { queryGscDailyMetrics, refreshGscAccessToken } from "./gsc-oauth";
import { decryptSecret } from "./token-encryption";
import type { AppUser, GscMetricSyncResult } from "./types";

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

export function normalizeDateRange(input: {
  startDate?: string | null;
  endDate?: string | null;
  now?: Date;
}): { startDate: string; endDate: string } {
  const now = input.now ?? new Date();
  const defaultEnd = daysAgoDate(now, 3);
  const defaultStart = daysAgoDate(now, 30);
  const startDate = input.startDate?.trim() || defaultStart;
  const endDate = input.endDate?.trim() || defaultEnd;

  if (!isIsoDateOnly(startDate) || !isIsoDateOnly(endDate) || startDate > endDate) {
    throw new Error("GSC_METRIC_DATE_RANGE_INVALID");
  }

  return {
    startDate,
    endDate
  };
}

function daysAgoDate(now: Date, days: number): string {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  date.setUTCDate(date.getUTCDate() - days);

  return date.toISOString().slice(0, 10);
}

function isIsoDateOnly(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}
