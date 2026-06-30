export type RateLimitPolicy = "auth-login" | "auth-register" | "invite-accept" | "invite-send";

export class RateLimitError extends Error {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("RATE_LIMITED");
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

type HeaderReader = {
  get(name: string): string | null;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const rateLimitPolicies = {
  "auth-login": {
    limit: 10,
    windowMs: 1000 * 60 * 15
  },
  "auth-register": {
    limit: 5,
    windowMs: 1000 * 60 * 60
  },
  "invite-accept": {
    limit: 20,
    windowMs: 1000 * 60 * 15
  },
  "invite-send": {
    limit: 30,
    windowMs: 1000 * 60 * 60
  }
} satisfies Record<RateLimitPolicy, { limit: number; windowMs: number }>;

const globalRateLimit = globalThis as typeof globalThis & {
  __scccRateLimitStore?: Map<string, RateLimitBucket>;
};

export function assertRateLimit(policy: RateLimitPolicy, key: string, now = Date.now()): void {
  const result = checkRateLimit(policy, key, now);

  if (!result.allowed) {
    throw new RateLimitError(result.retryAfterSeconds);
  }
}

export function checkRateLimit(policy: RateLimitPolicy, key: string, now = Date.now()) {
  const config = rateLimitPolicies[policy];
  const store = getRateLimitStore();
  const bucketKey = `${policy}:${key}`;
  const bucket = store.get(bucketKey);

  if (!bucket || bucket.resetAt <= now) {
    store.set(bucketKey, {
      count: 1,
      resetAt: now + config.windowMs
    });

    return {
      allowed: true,
      remaining: config.limit - 1,
      retryAfterSeconds: 0
    };
  }

  if (bucket.count >= config.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
    };
  }

  bucket.count += 1;

  return {
    allowed: true,
    remaining: config.limit - bucket.count,
    retryAfterSeconds: 0
  };
}

export function rateLimitKeyFromHeaders(headers: HeaderReader, discriminator = "global"): string {
  return `${readClientIp(headers)}:${normalizeDiscriminator(discriminator)}`;
}

export function resetRateLimitStore(): void {
  globalRateLimit.__scccRateLimitStore = new Map();
}

export function isRateLimitError(error: unknown): error is RateLimitError {
  return error instanceof RateLimitError;
}

function getRateLimitStore(): Map<string, RateLimitBucket> {
  globalRateLimit.__scccRateLimitStore ??= new Map();
  return globalRateLimit.__scccRateLimitStore;
}

function readClientIp(headers: HeaderReader): string {
  const forwardedFor = headers.get("x-forwarded-for");
  const firstForwarded = forwardedFor?.split(",")[0]?.trim();

  return (
    firstForwarded ||
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    "local"
  ).toLowerCase();
}

function normalizeDiscriminator(discriminator: string): string {
  return discriminator.trim().toLowerCase() || "global";
}
