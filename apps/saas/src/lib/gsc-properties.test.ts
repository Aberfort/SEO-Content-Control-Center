import { beforeEach, describe, expect, it } from "vitest";

import {
  createOrganization,
  createSite,
  getDevStore,
  resetDevStore,
  upsertGscConnection
} from "./dev-store";
import { selectGscPropertyForSite } from "./gsc-properties";
import { encryptSecret } from "./token-encryption";
import type { AppUser } from "./types";

const user: AppUser = {
  id: "00000000-0000-4000-8000-000000000809",
  email: "gsc-properties@example.com",
  name: "GSC Properties"
};

describe("gsc properties", () => {
  beforeEach(() => {
    delete process.env.SCCC_DATA_STORE;
    delete process.env.DATABASE_URL;
    process.env.SCCC_GSC_CLIENT_ID = "client-id";
    process.env.SCCC_GSC_CLIENT_SECRET = "client-secret";
    process.env.SCCC_GSC_REDIRECT_URI = "https://app.example.com/api/integrations/gsc/callback";
    process.env.SCCC_TOKEN_ENCRYPTION_KEY = "local-test-token-encryption-key";
    resetDevStore();
  });

  it("selects an accessible Search Console property through the connected refresh token", async () => {
    const organization = createOrganization({
      user,
      name: "GSC Properties SEO"
    });
    const site = createSite({
      user,
      organizationId: organization.id,
      name: "GSC Properties Blog",
      url: "https://properties.example.com/"
    });
    upsertGscConnection({
      user,
      organizationId: organization.id,
      siteId: site.id,
      googleAccountEmail: "search@example.com",
      propertyUrl: "sc-domain:properties.example.com",
      encryptedRefreshToken: encryptSecret("refresh-token")
    });
    const requests: { url: string; init?: RequestInit }[] = [];
    const fetcher = async (url: string | URL | Request, init?: RequestInit) => {
      requests.push({ url: String(url), init });

      if (String(url).includes("oauth2.googleapis.com/token")) {
        return Response.json({
          access_token: "fresh-access-token"
        });
      }

      return Response.json({
        siteEntry: [
          {
            siteUrl: "sc-domain:properties.example.com",
            permissionLevel: "siteOwner"
          },
          {
            siteUrl: "https://www.properties.example.com/",
            permissionLevel: "siteFullUser"
          }
        ]
      });
    };

    const result = await selectGscPropertyForSite({
      user,
      organizationId: organization.id,
      siteId: site.id,
      propertyUrl: "https://www.properties.example.com/",
      fetcher
    });

    expect(result).toMatchObject({
      siteId: site.id,
      connectedPropertyUrl: "https://www.properties.example.com/",
      connection: {
        siteId: site.id,
        googleAccountEmail: "search@example.com",
        propertyUrl: "https://www.properties.example.com/",
        disconnectedAt: null
      },
      properties: [
        {
          siteUrl: "https://www.properties.example.com/",
          permissionLevel: "siteFullUser",
          selected: true
        },
        {
          siteUrl: "sc-domain:properties.example.com",
          permissionLevel: "siteOwner",
          selected: false
        }
      ]
    });
    expect(result.connection).not.toHaveProperty("encryptedRefreshToken");
    expect(getDevStore().gscConnections).toHaveLength(2);
    expect(
      getDevStore().activityLogs.filter((log) => log.action === "gsc.property_selected")
    ).toHaveLength(1);
    expect(requests[0]?.url).toBe("https://oauth2.googleapis.com/token");
    expect(requests[1]?.url).toBe("https://www.googleapis.com/webmasters/v3/sites");
  });

  it("rejects a property that is not available to the connected Google account", async () => {
    const organization = createOrganization({
      user,
      name: "GSC Properties SEO"
    });
    const site = createSite({
      user,
      organizationId: organization.id,
      name: "GSC Properties Blog",
      url: "https://properties.example.com/"
    });
    upsertGscConnection({
      user,
      organizationId: organization.id,
      siteId: site.id,
      googleAccountEmail: "search@example.com",
      propertyUrl: "sc-domain:properties.example.com",
      encryptedRefreshToken: encryptSecret("refresh-token")
    });
    const fetcher = async (url: string | URL | Request) => {
      if (String(url).includes("oauth2.googleapis.com/token")) {
        return Response.json({
          access_token: "fresh-access-token"
        });
      }

      return Response.json({
        siteEntry: [
          {
            siteUrl: "sc-domain:properties.example.com",
            permissionLevel: "siteOwner"
          }
        ]
      });
    };

    await expect(
      selectGscPropertyForSite({
        user,
        organizationId: organization.id,
        siteId: site.id,
        propertyUrl: "https://unowned.example.com/",
        fetcher
      })
    ).rejects.toThrow("GSC_PROPERTY_NOT_ACCESSIBLE");
  });
});
