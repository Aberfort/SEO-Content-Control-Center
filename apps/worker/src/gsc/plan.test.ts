import { describe, expect, it } from "vitest";

import { planGscSyncJobs } from "./plan";

const now = new Date("2026-07-10T06:00:00.000Z");

describe("planGscSyncJobs", () => {
  it("plans a metrics job and an insights job per connected site", () => {
    const jobs = planGscSyncJobs(
      [
        {
          organizationId: "11111111-1111-4111-8111-111111111111",
          siteId: "22222222-2222-4222-8222-222222222222"
        }
      ],
      now
    );

    expect(jobs).toHaveLength(2);
    expect(jobs[0]).toEqual({
      name: "gsc.daily-metrics.sync",
      jobId:
        "gsc-metrics:11111111-1111-4111-8111-111111111111:22222222-2222-4222-8222-222222222222:2026-07-10",
      data: {
        organizationId: "11111111-1111-4111-8111-111111111111",
        siteId: "22222222-2222-4222-8222-222222222222"
      }
    });
    expect(jobs[1]?.name).toBe("gsc.search-insights.sync");
    expect(jobs[1]?.jobId).toContain("gsc-insights:");
  });

  it("keeps job ids stable for the same site and day", () => {
    const connection = {
      organizationId: "11111111-1111-4111-8111-111111111111",
      siteId: "22222222-2222-4222-8222-222222222222"
    };

    expect(planGscSyncJobs([connection], now)).toEqual(planGscSyncJobs([connection], now));
  });

  it("deduplicates repeated connections for the same site", () => {
    const connection = {
      organizationId: "11111111-1111-4111-8111-111111111111",
      siteId: "22222222-2222-4222-8222-222222222222"
    };

    expect(planGscSyncJobs([connection, connection], now)).toHaveLength(2);
  });
});
