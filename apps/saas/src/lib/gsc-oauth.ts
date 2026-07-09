import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { isTokenEncryptionConfigured } from "./token-encryption";
import type { GscConnectAction } from "./types";

type GscConnectActionInput = {
  canManageIntegrations: boolean;
  oauthConfigured?: boolean;
  tokenEncryptionConfigured?: boolean;
  stateSigningConfigured?: boolean;
  organizationId?: string;
  siteId?: string;
  propertyUrl?: string;
};

type GscOAuthStatePayload = {
  userId: string;
  organizationId: string;
  siteId: string;
  propertyUrl: string;
  nonce: string;
  expiresAt: number;
};

type GscOAuthStateInput = {
  userId: string;
  organizationId: string;
  siteId: string;
  propertyUrl: string;
  now?: Date;
  ttlMs?: number;
  env?: NodeJS.ProcessEnv;
};

type GscAuthorizationUrlInput = {
  state: string;
  env?: NodeJS.ProcessEnv;
};

type Fetcher = typeof fetch;

type GscTokenExchangeInput = {
  code: string;
  env?: NodeJS.ProcessEnv;
  fetcher?: Fetcher;
};

const gscOAuthStateTtlMs = 10 * 60 * 1000;
const gscOAuthScopes = ["openid", "email", "https://www.googleapis.com/auth/webmasters.readonly"];

export function isGscOAuthConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(
    hasEnvValue(env.SCCC_GSC_CLIENT_ID) &&
    hasEnvValue(env.SCCC_GSC_CLIENT_SECRET) &&
    hasEnvValue(env.SCCC_GSC_REDIRECT_URI)
  );
}

export function isGscStateSigningConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return hasEnvValue(resolveGscStateSecret(env));
}

export function buildGscConnectAction(input: GscConnectActionInput): GscConnectAction {
  if (!input.canManageIntegrations) {
    return buildDisabledAction("Your role can not manage integrations.");
  }

  if (!(input.oauthConfigured ?? isGscOAuthConfigured())) {
    return buildDisabledAction("Google Search Console OAuth is not configured.");
  }

  if (!(input.tokenEncryptionConfigured ?? isTokenEncryptionConfigured())) {
    return buildDisabledAction("Token encryption key is not configured.");
  }

  if (!(input.stateSigningConfigured ?? isGscStateSigningConfigured())) {
    return buildDisabledAction("Google Search Console OAuth state signing is not configured.");
  }

  if (!input.organizationId || !input.siteId || !input.propertyUrl) {
    return buildDisabledAction("Google Search Console connection target is not available.");
  }

  return {
    type: "gsc_oauth",
    label: "Connect Google Search Console",
    enabled: true,
    href: buildGscConnectHref({
      organizationId: input.organizationId,
      siteId: input.siteId,
      propertyUrl: input.propertyUrl
    }),
    disabledReason: null,
    requiresIntegrationManage: true,
    noMutation: false
  };
}

export function buildGscConnectHref(input: {
  organizationId: string;
  siteId: string;
  propertyUrl: string;
}): string {
  const params = new URLSearchParams({
    propertyUrl: input.propertyUrl
  });

  return `/api/organizations/${encodeURIComponent(input.organizationId)}/sites/${encodeURIComponent(
    input.siteId
  )}/gsc/oauth/start?${params.toString()}`;
}

export function createGscOAuthState(input: GscOAuthStateInput): string {
  const now = input.now ?? new Date();
  const ttlMs = input.ttlMs ?? gscOAuthStateTtlMs;
  const payload: GscOAuthStatePayload = {
    userId: input.userId,
    organizationId: input.organizationId,
    siteId: input.siteId,
    propertyUrl: input.propertyUrl,
    nonce: randomBytes(16).toString("base64url"),
    expiresAt: now.getTime() + ttlMs
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");

  return `${encodedPayload}.${signGscState(encodedPayload, input.env ?? process.env)}`;
}

export function parseGscOAuthState(
  state: string,
  input: {
    now?: Date;
    env?: NodeJS.ProcessEnv;
  } = {}
): GscOAuthStatePayload {
  const [encodedPayload, signature] = state.split(".");

  if (!encodedPayload || !signature) {
    throw new Error("GSC_OAUTH_STATE_INVALID");
  }

  const expectedSignature = signGscState(encodedPayload, input.env ?? process.env);

  if (!safeEqual(signature, expectedSignature)) {
    throw new Error("GSC_OAUTH_STATE_INVALID");
  }

  const payload = parseStatePayload(encodedPayload);
  const now = input.now ?? new Date();

  if (payload.expiresAt < now.getTime()) {
    throw new Error("GSC_OAUTH_STATE_EXPIRED");
  }

  return payload;
}

export function buildGscAuthorizationUrl(input: GscAuthorizationUrlInput): string {
  const env = input.env ?? process.env;

  if (!isGscOAuthConfigured(env)) {
    throw new Error("GSC_OAUTH_NOT_CONFIGURED");
  }

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", env.SCCC_GSC_CLIENT_ID?.trim() ?? "");
  url.searchParams.set("redirect_uri", env.SCCC_GSC_REDIRECT_URI?.trim() ?? "");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", gscOAuthScopes.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", input.state);

  return url.toString();
}

export function buildGscDashboardReturnUrl(input: {
  origin?: string | null;
  siteId?: string | null;
  status: "connected" | "error";
  message?: string | null;
}): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || input.origin || "http://localhost:3000";
  const url = new URL("/", base);

  if (input.siteId) {
    url.searchParams.set("site", input.siteId);
  }

  url.searchParams.set("gsc", input.status);

  if (input.message) {
    url.searchParams.set("message", input.message);
  }

  url.hash = "gsc-title";
  return url.toString();
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

function buildDisabledAction(disabledReason: string): GscConnectAction {
  return {
    type: "gsc_oauth",
    label: "Connect Google Search Console",
    enabled: false,
    href: null,
    disabledReason,
    requiresIntegrationManage: true,
    noMutation: true
  };
}

function signGscState(payload: string, env: NodeJS.ProcessEnv): string {
  const secret = resolveGscStateSecret(env);

  if (!secret) {
    throw new Error("GSC_OAUTH_STATE_SECRET_NOT_CONFIGURED");
  }

  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function resolveGscStateSecret(env: NodeJS.ProcessEnv): string | undefined {
  return env.SCCC_GSC_STATE_SECRET?.trim() || env.AUTH_SECRET?.trim();
}

function parseStatePayload(encodedPayload: string): GscOAuthStatePayload {
  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as {
      userId?: unknown;
      organizationId?: unknown;
      siteId?: unknown;
      propertyUrl?: unknown;
      nonce?: unknown;
      expiresAt?: unknown;
    };

    if (
      typeof payload.userId !== "string" ||
      typeof payload.organizationId !== "string" ||
      typeof payload.siteId !== "string" ||
      typeof payload.propertyUrl !== "string" ||
      typeof payload.nonce !== "string" ||
      typeof payload.expiresAt !== "number"
    ) {
      throw new Error("GSC_OAUTH_STATE_INVALID");
    }

    return {
      userId: payload.userId,
      organizationId: payload.organizationId,
      siteId: payload.siteId,
      propertyUrl: payload.propertyUrl,
      nonce: payload.nonce,
      expiresAt: payload.expiresAt
    };
  } catch {
    throw new Error("GSC_OAUTH_STATE_INVALID");
  }
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function hasEnvValue(value: string | undefined): boolean {
  return Boolean(value?.trim());
}
