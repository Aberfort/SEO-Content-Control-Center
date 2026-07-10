export type RateLimitPolicy =
  | "auth-login"
  | "auth-register"
  | "auth-password-reset"
  | "auth-2fa"
  | "invite-accept"
  | "invite-send"
  | "bulk-operation"
  | "plugin-challenge"
  | "plugin-exchange"
  | "plugin-sync"
  | "plugin-disconnect"
  | "billing-webhook";

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

export type RateLimitStore = {
  increment(bucketKey: string, windowMs: number, now: number): Promise<RateLimitBucket>;
};

export type RedisEvalClient = {
  eval(script: string, numKeys: number, ...args: Array<string | number>): Promise<unknown>;
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
  "auth-password-reset": {
    limit: 5,
    windowMs: 1000 * 60 * 60
  },
  "auth-2fa": {
    limit: 10,
    windowMs: 1000 * 60 * 15
  },
  "invite-accept": {
    limit: 20,
    windowMs: 1000 * 60 * 15
  },
  "invite-send": {
    limit: 30,
    windowMs: 1000 * 60 * 60
  },
  "bulk-operation": {
    limit: 120,
    windowMs: 1000 * 60 * 15
  },
  "plugin-challenge": {
    limit: 30,
    windowMs: 1000 * 60 * 15
  },
  "plugin-exchange": {
    limit: 10,
    windowMs: 1000 * 60 * 15
  },
  "plugin-sync": {
    limit: 120,
    windowMs: 1000 * 60 * 60
  },
  "plugin-disconnect": {
    limit: 10,
    windowMs: 1000 * 60 * 15
  },
  "billing-webhook": {
    limit: 300,
    windowMs: 1000 * 60 * 5
  }
} satisfies Record<RateLimitPolicy, { limit: number; windowMs: number }>;

const redisIncrementScript = [
  "local count = redis.call('INCR', KEYS[1])",
  "if count == 1 then",
  "  redis.call('PEXPIRE', KEYS[1], ARGV[1])",
  "end",
  "local ttl = redis.call('PTTL', KEYS[1])",
  "return {count, ttl}"
].join("\n");

const globalRateLimit = globalThis as typeof globalThis & {
  __scccRateLimitStore?: Map<string, RateLimitBucket>;
  __scccRateLimitBackend?: RateLimitStore | null;
};

export async function assertRateLimit(
  policy: RateLimitPolicy,
  key: string,
  now = Date.now()
): Promise<void> {
  const result = await checkRateLimit(policy, key, now);

  if (!result.allowed) {
    throw new RateLimitError(result.retryAfterSeconds);
  }
}

export async function checkRateLimit(policy: RateLimitPolicy, key: string, now = Date.now()) {
  const config = rateLimitPolicies[policy];
  const bucketKey = `${policy}:${key}`;
  const bucket = await incrementWithConfiguredStore(bucketKey, config.windowMs, now);

  if (bucket.count > config.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
    };
  }

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
  globalRateLimit.__scccRateLimitBackend = undefined;
}

export function isRateLimitError(error: unknown): error is RateLimitError {
  return error instanceof RateLimitError;
}

export function createInMemoryRateLimitStore(
  buckets: Map<string, RateLimitBucket> = new Map()
): RateLimitStore {
  return {
    increment(bucketKey, windowMs, now) {
      const bucket = buckets.get(bucketKey);

      if (!bucket || bucket.resetAt <= now) {
        const created = {
          count: 1,
          resetAt: now + windowMs
        };
        buckets.set(bucketKey, created);
        return Promise.resolve(created);
      }

      bucket.count += 1;
      return Promise.resolve(bucket);
    }
  };
}

export function createRedisRateLimitStore(client: RedisEvalClient): RateLimitStore {
  return {
    async increment(bucketKey, windowMs, now) {
      const raw = await client.eval(redisIncrementScript, 1, `sccc:rate:${bucketKey}`, windowMs);
      const [count, ttlMs] = parseRedisIncrementResult(raw);

      return {
        count,
        resetAt: now + (ttlMs > 0 ? ttlMs : windowMs)
      };
    }
  };
}

async function incrementWithConfiguredStore(
  bucketKey: string,
  windowMs: number,
  now: number
): Promise<RateLimitBucket> {
  const backend = await getConfiguredBackend();

  if (backend) {
    try {
      return await backend.increment(bucketKey, windowMs, now);
    } catch (error) {
      console.error("Rate limit Redis store failed; falling back to in-memory store.", error);
    }
  }

  return getInMemoryFallback().increment(bucketKey, windowMs, now);
}

async function getConfiguredBackend(): Promise<RateLimitStore | null> {
  if (globalRateLimit.__scccRateLimitBackend !== undefined) {
    return globalRateLimit.__scccRateLimitBackend;
  }

  const redisUrl = process.env.REDIS_URL;
  const storePreference = process.env.SCCC_RATE_LIMIT_STORE;

  if (!redisUrl || storePreference === "memory") {
    globalRateLimit.__scccRateLimitBackend = null;
    return null;
  }

  try {
    const { default: Redis } = await import("ioredis");
    const client = new Redis(redisUrl, {
      lazyConnect: false,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false
    });
    client.on("error", (error) => {
      console.error("Rate limit Redis connection error.", error);
    });
    globalRateLimit.__scccRateLimitBackend = createRedisRateLimitStore(client);
  } catch (error) {
    console.error("Rate limit Redis store could not be created; using in-memory store.", error);
    globalRateLimit.__scccRateLimitBackend = null;
  }

  return globalRateLimit.__scccRateLimitBackend;
}

function getInMemoryFallback(): RateLimitStore {
  globalRateLimit.__scccRateLimitStore ??= new Map();
  return createInMemoryRateLimitStore(globalRateLimit.__scccRateLimitStore);
}

function parseRedisIncrementResult(raw: unknown): [number, number] {
  if (!Array.isArray(raw) || raw.length < 2) {
    throw new Error("RATE_LIMIT_REDIS_RESULT_INVALID");
  }

  const count = Number(raw[0]);
  const ttlMs = Number(raw[1]);

  if (!Number.isFinite(count) || !Number.isFinite(ttlMs)) {
    throw new Error("RATE_LIMIT_REDIS_RESULT_INVALID");
  }

  return [count, ttlMs];
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
