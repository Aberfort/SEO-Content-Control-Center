import { describe, expect, it } from "vitest";

import {
  buildJobId,
  buildWorkerHeartbeatKey,
  defaultJobOptions,
  jobNames,
  maintenancePingJobDataSchema,
  queueNames,
  tenantJobDataSchema,
  workerHeartbeatSchema,
  workerHeartbeatTtlSeconds
} from "../src/contract";

describe("queue contract", () => {
  it("namespaces every queue with the product prefix", () => {
    for (const name of Object.values(queueNames)) {
      expect(name.startsWith("sccc-")).toBe(true);
    }
  });

  it("builds deterministic sanitized job ids", () => {
    expect(buildJobId(["GSC", "Org 1", "site_2", "2026-07-09"])).toBe(
      "gsc:org-1:site_2:2026-07-09"
    );
    expect(buildJobId(["gsc", "org 1", "site_2", "2026-07-09"])).toBe(
      buildJobId(["GSC", "Org 1", "site_2", "2026-07-09"])
    );
  });

  it("rejects empty job id parts", () => {
    expect(() => buildJobId([])).toThrow("JOB_ID_PARTS_REQUIRED");
    expect(() => buildJobId(["gsc", "  "])).toThrow("JOB_ID_PART_EMPTY");
  });

  it("requires organization and site scope on tenant job payloads", () => {
    expect(() =>
      tenantJobDataSchema.parse({
        organizationId: "not-a-uuid",
        siteId: "22222222-2222-4222-8222-222222222222"
      })
    ).toThrow();
    expect(
      tenantJobDataSchema.parse({
        organizationId: "11111111-1111-4111-8111-111111111111",
        siteId: "22222222-2222-4222-8222-222222222222",
        extra: "kept"
      })
    ).toMatchObject({
      organizationId: "11111111-1111-4111-8111-111111111111",
      siteId: "22222222-2222-4222-8222-222222222222"
    });
  });

  it("validates maintenance ping payloads strictly", () => {
    expect(maintenancePingJobDataSchema.parse({})).toEqual({ requestedBy: "manual" });
    expect(() => maintenancePingJobDataSchema.parse({ unexpected: true })).toThrow();
  });

  it("keeps retry defaults bounded", () => {
    expect(defaultJobOptions.attempts).toBeGreaterThanOrEqual(2);
    expect(defaultJobOptions.backoff.type).toBe("exponential");
    expect(defaultJobOptions.removeOnFail).toBeGreaterThan(defaultJobOptions.removeOnComplete);
  });

  it("builds namespaced worker heartbeat keys", () => {
    expect(buildWorkerHeartbeatKey("host:42")).toBe("sccc:worker:heartbeat:host:42");
    expect(() => buildWorkerHeartbeatKey("  ")).toThrow("WORKER_ID_REQUIRED");
    expect(workerHeartbeatTtlSeconds).toBeGreaterThan(0);
  });

  it("validates worker heartbeat payloads", () => {
    expect(
      workerHeartbeatSchema.parse({
        workerId: "host:42",
        startedAt: "2026-07-09T10:00:00.000Z",
        recordedAt: "2026-07-09T10:00:30.000Z",
        processedJobs: 3,
        failedJobs: 0
      })
    ).toMatchObject({ workerId: "host:42", processedJobs: 3 });
    expect(() =>
      workerHeartbeatSchema.parse({
        workerId: "host:42",
        startedAt: "not-a-date",
        recordedAt: "2026-07-09T10:00:30.000Z",
        processedJobs: 0,
        failedJobs: 0
      })
    ).toThrow();
  });

  it("reserves job names for upcoming queue consumers", () => {
    expect(jobNames.maintenancePing).toBe("maintenance.ping");
    expect(jobNames.gscDailyMetricsSync).toBe("gsc.daily-metrics.sync");
    expect(jobNames.bulkOperationExecute).toBe("bulk-operation.execute");
  });
});
