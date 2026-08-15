import { describe, expect, it, vi } from "vitest";

import { createDeliverablesScheduleHandler, createWorkspaceWeeklyDigestHandler } from "./handlers";
import { planWorkspaceDigestJobs } from "./plan";

describe("recurring deliverables", () => {
  it("plans one deterministic prior-week job per organization", () => {
    const jobs = planWorkspaceDigestJobs(
      ["22222222-2222-4222-8222-222222222222", "11111111-1111-4111-8111-111111111111"],
      new Date("2026-08-10T08:00:00.000Z")
    );

    expect(jobs[0]).toMatchObject({
      data: {
        organizationId: "11111111-1111-4111-8111-111111111111",
        startDate: "2026-08-03",
        endDate: "2026-08-09"
      }
    });
    expect(jobs[0]?.jobId).toContain("2026-08-03:2026-08-09");
  });

  it("schedules and validates workspace jobs", async () => {
    const enqueue = vi.fn();
    const schedule = createDeliverablesScheduleHandler({
      listOrganizationIds: async () => ["11111111-1111-4111-8111-111111111111"],
      enqueue,
      now: () => new Date("2026-08-10T08:00:00.000Z")
    });
    await expect(schedule({ id: "1", name: "deliverables.schedule", data: {} })).resolves.toEqual({
      organizations: 1,
      scheduledJobs: 1
    });
    expect(enqueue).toHaveBeenCalledOnce();

    const run = vi.fn(async () => ({ delivered: 2 }));
    const digest = createWorkspaceWeeklyDigestHandler({ run });
    await expect(
      digest({
        id: "2",
        name: "deliverables.workspace-weekly-digest",
        data: {
          organizationId: "11111111-1111-4111-8111-111111111111",
          startDate: "2026-08-03",
          endDate: "2026-08-09"
        }
      })
    ).resolves.toEqual({ delivered: 2 });
    expect(run).toHaveBeenCalledOnce();
  });
});
