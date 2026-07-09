const defaultInsightRowLimit = 100;
const maxInsightRowLimit = 25000;

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

export function normalizeInsightRowLimit(rowLimit?: number | null): number {
  if (!Number.isFinite(rowLimit)) {
    return defaultInsightRowLimit;
  }

  return Math.max(1, Math.min(maxInsightRowLimit, Math.floor(rowLimit ?? defaultInsightRowLimit)));
}

export function daysAgoDate(now: Date, days: number): string {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  date.setUTCDate(date.getUTCDate() - days);

  return date.toISOString().slice(0, 10);
}

export function dateOnlyToDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function isIsoDateOnly(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}
