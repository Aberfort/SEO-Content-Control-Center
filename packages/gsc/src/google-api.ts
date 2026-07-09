type Fetcher = typeof fetch;

export type GscPropertySummary = {
  siteUrl: string;
  permissionLevel: string;
};

export type GscDailyMetricInput = {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type GscSearchInsightInput = {
  page: string;
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

type GscTokenExchangeInput = {
  code: string;
  env?: NodeJS.ProcessEnv;
  fetcher?: Fetcher;
};

type GscRefreshTokenInput = {
  refreshToken: string;
  env?: NodeJS.ProcessEnv;
  fetcher?: Fetcher;
};

export function isGscOAuthConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(
    hasEnvValue(env.SCCC_GSC_CLIENT_ID) &&
    hasEnvValue(env.SCCC_GSC_CLIENT_SECRET) &&
    hasEnvValue(env.SCCC_GSC_REDIRECT_URI)
  );
}

/**
 * Refresh-token flows only need client credentials; the redirect URI is
 * required for browser OAuth flows but not for background token refresh.
 */
export function isGscClientConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(hasEnvValue(env.SCCC_GSC_CLIENT_ID) && hasEnvValue(env.SCCC_GSC_CLIENT_SECRET));
}

export async function exchangeGscAuthorizationCode(
  input: GscTokenExchangeInput
): Promise<{ accessToken: string; refreshToken: string }> {
  const env = input.env ?? process.env;

  if (!isGscOAuthConfigured(env)) {
    throw new Error("GSC_OAUTH_NOT_CONFIGURED");
  }

  const response = await (input.fetcher ?? fetch)("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: env.SCCC_GSC_CLIENT_ID?.trim() ?? "",
      client_secret: env.SCCC_GSC_CLIENT_SECRET?.trim() ?? "",
      code: input.code,
      grant_type: "authorization_code",
      redirect_uri: env.SCCC_GSC_REDIRECT_URI?.trim() ?? ""
    })
  });

  if (!response.ok) {
    throw new Error("GSC_TOKEN_EXCHANGE_FAILED");
  }

  const payload = (await response.json()) as {
    access_token?: unknown;
    refresh_token?: unknown;
  };

  if (typeof payload.access_token !== "string" || !payload.access_token.trim()) {
    throw new Error("GSC_TOKEN_EXCHANGE_FAILED");
  }

  if (typeof payload.refresh_token !== "string" || !payload.refresh_token.trim()) {
    throw new Error("GSC_REFRESH_TOKEN_MISSING");
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token
  };
}

export async function refreshGscAccessToken(input: GscRefreshTokenInput): Promise<string> {
  const env = input.env ?? process.env;

  if (!isGscClientConfigured(env)) {
    throw new Error("GSC_OAUTH_NOT_CONFIGURED");
  }

  const response = await (input.fetcher ?? fetch)("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: env.SCCC_GSC_CLIENT_ID?.trim() ?? "",
      client_secret: env.SCCC_GSC_CLIENT_SECRET?.trim() ?? "",
      grant_type: "refresh_token",
      refresh_token: input.refreshToken
    })
  });

  if (!response.ok) {
    throw new Error("GSC_TOKEN_REFRESH_FAILED");
  }

  const payload = (await response.json()) as { access_token?: unknown };

  if (typeof payload.access_token !== "string" || !payload.access_token.trim()) {
    throw new Error("GSC_TOKEN_REFRESH_FAILED");
  }

  return payload.access_token;
}

export async function fetchGscGoogleAccountEmail(input: {
  accessToken: string;
  fetcher?: Fetcher;
}): Promise<string> {
  const response = await (input.fetcher ?? fetch)("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: {
      authorization: `Bearer ${input.accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error("GSC_USERINFO_FAILED");
  }

  const payload = (await response.json()) as { email?: unknown };

  if (typeof payload.email !== "string" || !payload.email.trim()) {
    throw new Error("GSC_USERINFO_FAILED");
  }

  return payload.email.trim();
}

export async function listGscProperties(input: {
  accessToken: string;
  fetcher?: Fetcher;
}): Promise<GscPropertySummary[]> {
  const response = await (input.fetcher ?? fetch)(
    "https://www.googleapis.com/webmasters/v3/sites",
    {
      headers: {
        authorization: `Bearer ${input.accessToken}`
      }
    }
  );

  if (!response.ok) {
    throw new Error("GSC_PROPERTIES_LIST_FAILED");
  }

  const payload = (await response.json()) as {
    siteEntry?: unknown;
  };
  const entries = Array.isArray(payload.siteEntry) ? payload.siteEntry : [];

  return entries
    .flatMap((entry): GscPropertySummary[] => {
      if (
        !entry ||
        typeof entry !== "object" ||
        typeof (entry as { siteUrl?: unknown }).siteUrl !== "string"
      ) {
        return [];
      }

      const siteUrl = (entry as { siteUrl: string }).siteUrl.trim();

      if (!siteUrl) {
        return [];
      }

      const permissionLevel =
        typeof (entry as { permissionLevel?: unknown }).permissionLevel === "string"
          ? (entry as { permissionLevel: string }).permissionLevel
          : "unknown";

      return [
        {
          siteUrl,
          permissionLevel
        }
      ];
    })
    .sort((left, right) => left.siteUrl.localeCompare(right.siteUrl));
}

export async function queryGscDailyMetrics(input: {
  accessToken: string;
  propertyUrl: string;
  startDate: string;
  endDate: string;
  fetcher?: Fetcher;
}): Promise<GscDailyMetricInput[]> {
  const response = await (input.fetcher ?? fetch)(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
      input.propertyUrl
    )}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${input.accessToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        startDate: input.startDate,
        endDate: input.endDate,
        dimensions: ["date"],
        type: "web",
        rowLimit: 25000
      })
    }
  );

  if (!response.ok) {
    throw new Error("GSC_SEARCH_ANALYTICS_FAILED");
  }

  const payload = (await response.json()) as {
    rows?: unknown;
  };
  const rows = Array.isArray(payload.rows) ? payload.rows : [];

  return rows
    .flatMap((row): GscDailyMetricInput[] => {
      if (!row || typeof row !== "object") {
        return [];
      }

      const keys = (row as { keys?: unknown }).keys;
      const date = Array.isArray(keys) && typeof keys[0] === "string" ? keys[0] : null;

      if (!date || !isIsoDateOnly(date)) {
        return [];
      }

      return [
        {
          date,
          clicks: readMetricNumber(row, "clicks"),
          impressions: readMetricNumber(row, "impressions"),
          ctr: readMetricNumber(row, "ctr"),
          position: readMetricNumber(row, "position")
        }
      ];
    })
    .sort((left, right) => left.date.localeCompare(right.date));
}

export async function queryGscSearchInsights(input: {
  accessToken: string;
  propertyUrl: string;
  startDate: string;
  endDate: string;
  rowLimit: number;
  fetcher?: Fetcher;
}): Promise<GscSearchInsightInput[]> {
  const response = await (input.fetcher ?? fetch)(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
      input.propertyUrl
    )}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${input.accessToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        startDate: input.startDate,
        endDate: input.endDate,
        dimensions: ["page", "query"],
        type: "web",
        rowLimit: input.rowLimit
      })
    }
  );

  if (!response.ok) {
    throw new Error("GSC_SEARCH_ANALYTICS_FAILED");
  }

  const payload = (await response.json()) as {
    rows?: unknown;
  };
  const rows = Array.isArray(payload.rows) ? payload.rows : [];

  return rows.flatMap((row): GscSearchInsightInput[] => {
    if (!row || typeof row !== "object") {
      return [];
    }

    const keys = (row as { keys?: unknown }).keys;
    const page = Array.isArray(keys) && typeof keys[0] === "string" ? keys[0].trim() : "";
    const query = Array.isArray(keys) && typeof keys[1] === "string" ? keys[1].trim() : "";

    if (!page || !query) {
      return [];
    }

    return [
      {
        page,
        query,
        clicks: readMetricNumber(row, "clicks"),
        impressions: readMetricNumber(row, "impressions"),
        ctr: readMetricNumber(row, "ctr"),
        position: readMetricNumber(row, "position")
      }
    ];
  });
}

export function selectGscPropertyForSite(
  properties: GscPropertySummary[],
  requestedPropertyUrl: string
): GscPropertySummary | null {
  const requested = requestedPropertyUrl.trim();
  const normalizedRequested = normalizePropertyUrl(requested);
  const exactMatch = properties.find(
    (property) => normalizePropertyUrl(property.siteUrl) === normalizedRequested
  );

  if (exactMatch) {
    return exactMatch;
  }

  const requestedUrl = parseUrl(requested);
  const requestedHost = requestedUrl?.host.toLowerCase() ?? null;

  if (!requestedUrl || !requestedHost) {
    return null;
  }

  const urlPrefixMatch = properties.find((property) => {
    const propertyUrl = parseUrl(property.siteUrl);

    return (
      propertyUrl &&
      propertyUrl.host.toLowerCase() === requestedHost &&
      requestedUrl.pathname.startsWith(propertyUrl.pathname)
    );
  });

  if (urlPrefixMatch) {
    return urlPrefixMatch;
  }

  return (
    properties.find((property) => {
      const domain = parseScDomainProperty(property.siteUrl);

      return domain ? hostMatchesDomain(requestedHost, domain) : false;
    }) ?? null
  );
}

function normalizePropertyUrl(value: string): string {
  const trimmed = value.trim();
  const domain = parseScDomainProperty(trimmed);

  if (domain) {
    return `sc-domain:${domain}`;
  }

  const parsed = parseUrl(trimmed);

  if (!parsed) {
    return trimmed;
  }

  parsed.hash = "";
  parsed.search = "";
  parsed.hostname = parsed.hostname.toLowerCase();
  parsed.pathname = parsed.pathname.replace(/\/+$/, "");

  return parsed.toString();
}

function parseScDomainProperty(value: string): string | null {
  const trimmed = value.trim().toLowerCase();

  if (!trimmed.startsWith("sc-domain:")) {
    return null;
  }

  const domain = trimmed.slice("sc-domain:".length).replace(/^www\./, "");

  return domain || null;
}

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function hostMatchesDomain(host: string, domain: string): boolean {
  const normalizedHost = host.toLowerCase().replace(/^www\./, "");
  const normalizedDomain = domain.toLowerCase().replace(/^www\./, "");

  return normalizedHost === normalizedDomain || normalizedHost.endsWith(`.${normalizedDomain}`);
}

function readMetricNumber(row: object, key: "clicks" | "impressions" | "ctr" | "position"): number {
  const value = (row as Record<string, unknown>)[key];

  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function isIsoDateOnly(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function hasEnvValue(value: string | undefined): boolean {
  return Boolean(value?.trim());
}
