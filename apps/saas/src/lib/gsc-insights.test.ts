import { beforeEach, describe, expect, it } from "vitest";

import { createOrganization, createSite, resetDevStore, upsertGscConnection } from "./dev-store";
import { normalizeInsightRowLimit, syncGscSearchInsightsForSite } from "./gsc-insights";
import { encryptSecret } from "./token-encryption";
import type { AppUser } from "./types";

const user: AppUser = {
  id: "00000000-0000-4000-8000-000000000810",
  email: "gsc-insights@example.com",
  name: "GSC Insights"
};

describe("gsc insights", () => {
  beforeEach(() => {
    delete process.env.SCCC_DATA_STORE;
    delete process.env.DATABASE_URL;
    process.env.SCCC_GSC_CLIENT_ID = "client-id";
    process.env.SCCC_GSC_CLIENT_SECRET = "client-secret";
    process.env.SCCC_GSC_REDIRECT_URI = "https://app.example.com/api/integrations/gsc/callback";
    process.env.SCCC_TOKEN_ENCRYPTION_KEY = "local-test-token-encryption-key";
    resetDevStore();
  });

  it("normalizes Search Analytics insight row limits", () => {
    expect(normalizeInsightRowLimit()).toBe(100);
    expect(normalizeInsightRowLimit(0)).toBe(1);
    expect(normalizeInsightRowLimit(25001)).toBe(25000);
    expect(normalizeInsightRowLimit(12.8)).toBe(12);
  });

  it("syncs top page/query insights through the connected GSC refresh token", async () => {
    const organization = createOrganization({
      user,
      name: "GSC Insights SEO"
    });
    const site = createSite({
      user,
      organizationId: organization.id,
      name: "GSC Insights Blog",
      url: "https://insights.example.com/"
    });
    upsertGscConnection({
      user,
      organizationId: organization.id,
      siteId: site.id,
      googleAccountEmail: "search@example.com",
      propertyUrl: "sc-domain:insights.example.com",
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
        rows: [
          {
            keys: ["https://insights.example.com/post/", "content audit"],
            clicks: 42,
            impressions: 420,
            ctr: 0.1,
            position: 2.4
          },
          {
            keys: ["https://insights.example.com/", "seo dashboard"],
            clicks: 24,
            impressions: 300,
            ctr: 0.08,
            position: 5.1
          }
        ]
      });
    };

    const result = await syncGscSearchInsightsForSite({
      user,
      organizationId: organization.id,
      siteId: site.id,
      startDate: "2026-07-01",
      endDate: "2026-07-02",
      rowLimit: 2,
      fetcher
    });

    expect(result).toMatchObject({
      siteId: site.id,
      propertyUrl: "sc-domain:insights.example.com",
      startDate: "2026-07-01",
      endDate: "2026-07-02",
      syncedRows: 2,
      insights: [
        {
          page: "https://insights.example.com/post/",
          query: "content audit",
          clicks: 42,
          impressions: 420,
          ctr: 0.1,
          position: 2.4
        },
        {
          page: "https://insights.example.com/",
          query: "seo dashboard",
          clicks: 24,
          impressions: 300,
          ctr: 0.08,
          position: 5.1
        }
      ]
    });
    expect(requests[1]?.url).toBe(
      "https://www.googleapis.com/webmasters/v3/sites/sc-domain%3Ainsights.example.com/searchAnalytics/query"
    );
    expect(requests[1]?.init?.body).toBe(
      JSON.stringify({
        startDate: "2026-07-01",
        endDate: "2026-07-02",
        dimensions: ["page", "query"],
        type: "web",
        rowLimit: 2
      })
    );
  });

  it("replaces an existing synced page/query range", async () => {
    const organization = createOrganization({
      user,
      name: "GSC Insights SEO"
    });
    const site = createSite({
      user,
      organizationId: organization.id,
      name: "GSC Insights Blog",
      url: "https://insights.example.com/"
    });
    upsertGscConnection({
      user,
      organizationId: organization.id,
      siteId: site.id,
      googleAccountEmail: "search@example.com",
      propertyUrl: "sc-domain:insights.example.com",
      encryptedRefreshToken: encryptSecret("refresh-token")
    });
    let rows = [
      {
        keys: ["https://insights.example.com/old/", "old query"],
        clicks: 10,
        impressions: 100,
        ctr: 0.1,
        position: 8
      }
    ];
    const fetcher = async (url: string | URL | Request) => {
      if (String(url).includes("oauth2.googleapis.com/token")) {
        return Response.json({
          access_token: "fresh-access-token"
        });
      }

      return Response.json({ rows });
    };

    await syncGscSearchInsightsForSite({
      user,
      organizationId: organization.id,
      siteId: site.id,
      startDate: "2026-07-01",
      endDate: "2026-07-02",
      fetcher
    });
    rows = [
      {
        keys: ["https://insights.example.com/new/", "new query"],
        clicks: 20,
        impressions: 200,
        ctr: 0.1,
        position: 4
      }
    ];
    const result = await syncGscSearchInsightsForSite({
      user,
      organizationId: organization.id,
      siteId: site.id,
      startDate: "2026-07-01",
      endDate: "2026-07-02",
      fetcher
    });

    expect(result.insights).toHaveLength(1);
    expect(result.insights[0]).toMatchObject({
      page: "https://insights.example.com/new/",
      query: "new query",
      clicks: 20
    });
  });
});
