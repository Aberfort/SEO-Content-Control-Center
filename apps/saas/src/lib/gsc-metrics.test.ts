import { beforeEach, describe, expect, it } from "vitest";

import { createOrganization, createSite, resetDevStore, upsertGscConnection } from "./dev-store";
import { normalizeDateRange, syncGscDailyMetricsForSite } from "./gsc-metrics";
import { encryptSecret } from "./token-encryption";
import type { AppUser } from "./types";

const user: AppUser = {
  id: "00000000-0000-4000-8000-000000000808",
  email: "gsc-metrics@example.com",
  name: "GSC Metrics"
};

describe("gsc metrics", () => {
  beforeEach(() => {
    delete process.env.SCCC_DATA_STORE;
    delete process.env.DATABASE_URL;
    process.env.SCCC_GSC_CLIENT_ID = "client-id";
    process.env.SCCC_GSC_CLIENT_SECRET = "client-secret";
    process.env.SCCC_GSC_REDIRECT_URI = "https://app.example.com/api/integrations/gsc/callback";
    process.env.SCCC_TOKEN_ENCRYPTION_KEY = "local-test-token-encryption-key";
    resetDevStore();
  });

  it("normalizes the default finalized date range", () => {
    expect(
      normalizeDateRange({
        now: new Date("2026-07-09T12:00:00.000Z")
      })
    ).toEqual({
      startDate: "2026-06-09",
      endDate: "2026-07-06"
    });
    expect(() =>
      normalizeDateRange({
        startDate: "2026-07-10",
        endDate: "2026-07-01"
      })
    ).toThrow("GSC_METRIC_DATE_RANGE_INVALID");
  });

  it("syncs daily metrics through the connected GSC refresh token", async () => {
    const organization = createOrganization({
      user,
      name: "GSC Metrics SEO"
    });
    const site = createSite({
      user,
      organizationId: organization.id,
      name: "GSC Metrics Blog",
      url: "https://metrics.example.com/"
    });
    upsertGscConnection({
      user,
      organizationId: organization.id,
      siteId: site.id,
      googleAccountEmail: "search@example.com",
      propertyUrl: "sc-domain:metrics.example.com",
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
            keys: ["2026-07-01"],
            clicks: 12,
            impressions: 120,
            ctr: 0.1,
            position: 4.2
          },
          {
            keys: ["2026-07-02"],
            clicks: 18,
            impressions: 180,
            ctr: 0.1,
            position: 3.8
          }
        ]
      });
    };

    const result = await syncGscDailyMetricsForSite({
      user,
      organizationId: organization.id,
      siteId: site.id,
      startDate: "2026-07-01",
      endDate: "2026-07-02",
      fetcher
    });

    expect(result).toMatchObject({
      siteId: site.id,
      propertyUrl: "sc-domain:metrics.example.com",
      startDate: "2026-07-01",
      endDate: "2026-07-02",
      syncedRows: 2,
      metrics: [
        {
          date: "2026-07-01",
          clicks: 12,
          impressions: 120,
          ctr: 0.1,
          position: 4.2
        },
        {
          date: "2026-07-02",
          clicks: 18,
          impressions: 180,
          ctr: 0.1,
          position: 3.8
        }
      ]
    });
    expect(requests[1]?.url).toBe(
      "https://www.googleapis.com/webmasters/v3/sites/sc-domain%3Ametrics.example.com/searchAnalytics/query"
    );
    expect(requests[1]?.init?.body).toBe(
      JSON.stringify({
        startDate: "2026-07-01",
        endDate: "2026-07-02",
        dimensions: ["date"],
        type: "web",
        rowLimit: 25000
      })
    );
  });
});
