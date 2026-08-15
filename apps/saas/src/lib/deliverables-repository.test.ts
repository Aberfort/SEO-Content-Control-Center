import { beforeEach, describe, expect, it } from "vitest";

import { getAppRepository } from "./app-repository";
import { resetDevStore } from "./dev-store";
import type { AppUser } from "./types";

const user: AppUser = {
  id: "00000000-0000-4000-8000-000000000125",
  email: "deliverables@example.com",
  name: "Deliverables Owner"
};

describe("deliverables repository", () => {
  beforeEach(() => {
    delete process.env.SCCC_DATA_STORE;
    delete process.env.DATABASE_URL;
    resetDevStore();
  });

  it("persists member delivery preferences and produces a tenant-scoped report", async () => {
    const repository = getAppRepository();
    const organization = await repository.createOrganization({ user, name: "North Agency" });
    const site = await repository.createSite({
      user,
      organizationId: organization.id,
      name: "Client Site",
      url: "https://client.example"
    });

    await expect(repository.getDeliveryPreference(user.id, organization.id)).resolves.toMatchObject(
      {
        emailEnabled: true,
        weeklyDigest: true
      }
    );
    await expect(
      repository.updateDeliveryPreference({
        user,
        organizationId: organization.id,
        emailEnabled: true,
        criticalAlerts: true,
        trafficDropAlerts: false,
        overdueAlerts: true,
        failedOperationAlerts: false,
        weeklyDigest: false
      })
    ).resolves.toMatchObject({
      trafficDropAlerts: false,
      failedOperationAlerts: false,
      weeklyDigest: false
    });

    await expect(
      repository.getClientReport(user.id, organization.id, {
        siteId: site.id,
        startDate: "2026-08-03",
        endDate: "2026-08-09",
        format: "html"
      })
    ).resolves.toMatchObject({
      organizationId: organization.id,
      organizationName: "North Agency",
      period: { startDate: "2026-08-03", endDate: "2026-08-09" },
      totals: {
        newCriticalFindings: 0,
        overdueTasks: 0
      },
      sites: [{ siteId: site.id, siteName: "Client Site" }]
    });
  });
});
