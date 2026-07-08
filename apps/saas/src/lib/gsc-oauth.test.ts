import { describe, expect, it } from "vitest";

import { buildGscConnectAction, isGscOAuthConfigured } from "./gsc-oauth";

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

  it("keeps the connect action disabled until the callback flow is implemented", () => {
    expect(
      buildGscConnectAction({
        canManageIntegrations: false,
        oauthConfigured: true
      })
    ).toMatchObject({
      enabled: false,
      disabledReason: "Your role can not manage integrations."
    });
    expect(
      buildGscConnectAction({
        canManageIntegrations: true,
        oauthConfigured: false
      })
    ).toMatchObject({
      enabled: false,
      disabledReason: "Google Search Console OAuth is not configured."
    });
    expect(
      buildGscConnectAction({
        canManageIntegrations: true,
        oauthConfigured: true
      })
    ).toMatchObject({
      enabled: false,
      disabledReason: "Google Search Console OAuth callback is not implemented yet."
    });
  });
});
