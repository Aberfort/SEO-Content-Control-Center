import { describe, expect, it } from "vitest";

import {
  buildGscAuthorizationUrl,
  buildGscConnectAction,
  createGscOAuthState,
  exchangeGscAuthorizationCode,
  fetchGscGoogleAccountEmail,
  isGscOAuthConfigured,
  parseGscOAuthState
} from "./gsc-oauth";

describe("gsc oauth", () => {
  it("reports configuration readiness from required OAuth settings", () => {
    expect(
      isGscOAuthConfigured({
        SCCC_GSC_CLIENT_ID: "client-id",
        SCCC_GSC_CLIENT_SECRET: "client-secret",
        SCCC_GSC_REDIRECT_URI: "https://app.example.com/api/integrations/gsc/callback"
      })
    ).toBe(true);
    expect(
      isGscOAuthConfigured({
        SCCC_GSC_CLIENT_ID: "client-id",
        SCCC_GSC_CLIENT_SECRET: "client-secret"
      })
    ).toBe(false);
    expect(
      isGscOAuthConfigured({
        SCCC_GSC_CLIENT_ID: "client-id",
        SCCC_GSC_CLIENT_SECRET: " ",
        SCCC_GSC_REDIRECT_URI: "https://app.example.com/api/integrations/gsc/callback"
      })
    ).toBe(false);
  });

  it("keeps the connect action disabled until OAuth storage prerequisites are configured", () => {
    expect(
      buildGscConnectAction({
        canManageIntegrations: false,
        oauthConfigured: true,
        tokenEncryptionConfigured: true,
        stateSigningConfigured: true,
        organizationId: "org_1",
        siteId: "site_1",
        propertyUrl: "https://example.com/"
      })
    ).toMatchObject({
      enabled: false,
      disabledReason: "Your role can not manage integrations."
    });
    expect(
      buildGscConnectAction({
        canManageIntegrations: true,
        oauthConfigured: false,
        tokenEncryptionConfigured: true,
        stateSigningConfigured: true,
        organizationId: "org_1",
        siteId: "site_1",
        propertyUrl: "https://example.com/"
      })
    ).toMatchObject({
      enabled: false,
      disabledReason: "Google Search Console OAuth is not configured."
    });
    expect(
      buildGscConnectAction({
        canManageIntegrations: true,
        oauthConfigured: true,
        tokenEncryptionConfigured: false,
        stateSigningConfigured: true,
        organizationId: "org_1",
        siteId: "site_1",
        propertyUrl: "https://example.com/"
      })
    ).toMatchObject({
      enabled: false,
      disabledReason: "Token encryption key is not configured."
    });
  });

  it("enables a connect href when OAuth, encryption, and state signing are configured", () => {
    expect(
      buildGscConnectAction({
        canManageIntegrations: true,
        oauthConfigured: true,
        tokenEncryptionConfigured: true,
        stateSigningConfigured: true,
        organizationId: "org_1",
        siteId: "site_1",
        propertyUrl: "https://example.com/"
      })
    ).toMatchObject({
      enabled: true,
      href: "/api/organizations/org_1/sites/site_1/gsc/oauth/start?propertyUrl=https%3A%2F%2Fexample.com%2F",
      disabledReason: null,
      noMutation: false
    });
  });

  it("signs and verifies OAuth state with tenant and site scope", () => {
    const state = createGscOAuthState({
      userId: "user_1",
      organizationId: "org_1",
      siteId: "site_1",
      propertyUrl: "https://example.com/",
      now: new Date("2026-07-09T10:00:00.000Z"),
      env: {
        AUTH_SECRET: "state-secret"
      }
    });

    expect(
      parseGscOAuthState(state, {
        now: new Date("2026-07-09T10:01:00.000Z"),
        env: {
          AUTH_SECRET: "state-secret"
        }
      })
    ).toMatchObject({
      userId: "user_1",
      organizationId: "org_1",
      siteId: "site_1",
      propertyUrl: "https://example.com/"
    });
    expect(() =>
      parseGscOAuthState(`${state}tampered`, {
        env: {
          AUTH_SECRET: "state-secret"
        }
      })
    ).toThrow("GSC_OAUTH_STATE_INVALID");
    expect(() =>
      parseGscOAuthState(state, {
        now: new Date("2026-07-09T10:20:00.000Z"),
        env: {
          AUTH_SECRET: "state-secret"
        }
      })
    ).toThrow("GSC_OAUTH_STATE_EXPIRED");
  });

  it("builds the Google authorization URL with offline read-only scope", () => {
    const url = new URL(
      buildGscAuthorizationUrl({
        state: "signed-state",
        env: {
          SCCC_GSC_CLIENT_ID: "client-id",
          SCCC_GSC_CLIENT_SECRET: "client-secret",
          SCCC_GSC_REDIRECT_URI: "https://app.example.com/api/integrations/gsc/callback"
        }
      })
    );

    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
    expect(url.searchParams.get("scope")).toContain(
      "https://www.googleapis.com/auth/webmasters.readonly"
    );
    expect(url.searchParams.get("state")).toBe("signed-state");
  });

  it("exchanges an authorization code and reads the Google account email", async () => {
    const requests: { url: string; init?: RequestInit }[] = [];
    const fetcher = async (url: string | URL | Request, init?: RequestInit) => {
      requests.push({ url: String(url), init });

      if (String(url).includes("oauth2.googleapis.com/token")) {
        return Response.json({
          access_token: "access-token",
          refresh_token: "refresh-token"
        });
      }

      return Response.json({
        email: "search@example.com"
      });
    };
    const tokens = await exchangeGscAuthorizationCode({
      code: "oauth-code",
      fetcher,
      env: {
        SCCC_GSC_CLIENT_ID: "client-id",
        SCCC_GSC_CLIENT_SECRET: "client-secret",
        SCCC_GSC_REDIRECT_URI: "https://app.example.com/api/integrations/gsc/callback"
      }
    });
    const email = await fetchGscGoogleAccountEmail({
      accessToken: tokens.accessToken,
      fetcher
    });

    expect(tokens).toEqual({
      accessToken: "access-token",
      refreshToken: "refresh-token"
    });
    expect(email).toBe("search@example.com");
    expect(requests[0]?.url).toBe("https://oauth2.googleapis.com/token");
    expect(requests[1]?.init?.headers).toMatchObject({
      authorization: "Bearer access-token"
    });
  });
});
