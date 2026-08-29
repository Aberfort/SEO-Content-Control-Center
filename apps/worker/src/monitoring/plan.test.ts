import { describe, expect, it } from "vitest";

import { planMonitoringScanJobs } from "./plan";

const now = new Date("2026-08-26T14:00:00.000Z");

describe("planMonitoringScanJobs", () => {
  it("plans one create-snapshot job per candidate", () => {
    const jobs = planMonitoringScanJobs(
      [
        {
          organizationId: "11111111-1111-4111-8111-111111111111",
          siteId: "22222222-2222-4222-8222-222222222222",
          monitoredUrlId: "33333333-3333-4333-8333-333333333333"
        }
      ],
      now
    );

    expect(jobs).toEqual([
      {
        name: "monitoring.create-snapshot",
        jobId:
          "monitoring-scan:11111111-1111-4111-8111-111111111111:22222222-2222-4222-8222-222222222222:33333333-3333-4333-8333-333333333333:2026-08-26-2",
        data: {
          organizationId: "11111111-1111-4111-8111-111111111111",
          siteId: "22222222-2222-4222-8222-222222222222",
          monitoredUrlId: "33333333-3333-4333-8333-333333333333"
        }
      }
    ]);
  });

  it("deduplicates repeated candidates within the same run", () => {
    const candidate = {
      organizationId: "11111111-1111-4111-8111-111111111111",
      siteId: "22222222-2222-4222-8222-222222222222",
      monitoredUrlId: "33333333-3333-4333-8333-333333333333"
    };

    const jobs = planMonitoringScanJobs([candidate, candidate], now);

    expect(jobs).toHaveLength(1);
  });

  it("keeps job ids stable within the same scan window and changes them across windows", () => {
    const candidate = {
      organizationId: "11111111-1111-4111-8111-111111111111",
      siteId: "22222222-2222-4222-8222-222222222222",
      monitoredUrlId: "33333333-3333-4333-8333-333333333333"
    };

    const sameWindowLater = new Date("2026-08-26T16:00:00.000Z");
    const nextWindow = new Date("2026-08-26T20:00:00.000Z");

    expect(planMonitoringScanJobs([candidate], now)[0]?.jobId).toEqual(
      planMonitoringScanJobs([candidate], sameWindowLater)[0]?.jobId
    );
    expect(planMonitoringScanJobs([candidate], now)[0]?.jobId).not.toEqual(
      planMonitoringScanJobs([candidate], nextWindow)[0]?.jobId
    );
  });

  it("returns no jobs for an empty candidate list", () => {
    expect(planMonitoringScanJobs([], now)).toEqual([]);
  });
});
