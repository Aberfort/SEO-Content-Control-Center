/**
 * Small in-memory, per-process rate limiter shared by the marketing site's
 * public server actions (demo form, free page checker). Fine for a single
 * Vercel function instance — it resets on cold start and isn't shared across
 * instances — which is an acceptable trade-off for slowing down casual abuse
 * of an unauthenticated form, not a security boundary.
 */

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const globalWithRateLimits = globalThis as typeof globalThis & {
  scccRateLimitBuckets?: Map<string, Map<string, RateLimitBucket>>;
};

const bucketStores =
  globalWithRateLimits.scccRateLimitBuckets ??
  (globalWithRateLimits.scccRateLimitBuckets = new Map<string, Map<string, RateLimitBucket>>());

export type RateLimitOptions = {
  windowMs: number;
  maxRequests: number;
};

/** Returns true if `key` is still within its allowance for `bucketName`, consuming one request if so. */
export function consumeRateLimit(
  bucketName: string,
  key: string,
  options: RateLimitOptions,
  now = Date.now()
): boolean {
  let buckets = bucketStores.get(bucketName);

  if (!buckets) {
    buckets = new Map<string, RateLimitBucket>();
    bucketStores.set(bucketName, buckets);
  }

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    pruneRateLimitBucket(buckets, now);
    return true;
  }

  if (existing.count >= options.maxRequests) {
    return false;
  }

  existing.count += 1;
  return true;
}

function pruneRateLimitBucket(buckets: Map<string, RateLimitBucket>, now: number): void {
  if (buckets.size < 500) {
    return;
  }

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

/** Best-effort client identity for rate limiting — not authoritative, just enough to slow down abuse. */
export function readClientKey(requestHeaders: Headers): string {
  const forwardedFor = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || requestHeaders.get("x-real-ip")?.trim() || "unknown";
}
