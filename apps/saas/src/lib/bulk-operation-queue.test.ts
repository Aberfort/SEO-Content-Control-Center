import { describe, expect, it } from "vitest";

import {
  enqueueBulkOperationExecutionJob,
  enqueueBulkOperationRollbackJob
} from "./bulk-operation-queue";

const jobScope = {
  organizationId: "11111111-1111-4111-8111-111111111111",
  siteId: "22222222-2222-4222-8222-222222222222",
  operationId: "33333333-3333-4333-8333-333333333333",
  env: {
    REDIS_URL: ""
  }
};

describe("bulk operation queue producers", () => {
  it("keeps execution enqueue optional without Redis", async () => {
    await expect(enqueueBulkOperationExecutionJob(jobScope)).resolves.toEqual({
      enqueued: false,
      reason: "redis_not_configured"
    });
  });

  it("keeps rollback enqueue optional without Redis", async () => {
    await expect(enqueueBulkOperationRollbackJob(jobScope)).resolves.toEqual({
      enqueued: false,
      reason: "redis_not_configured"
    });
  });
});
