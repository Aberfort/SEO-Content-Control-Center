import { describe, expect, it } from "vitest";

import {
  createBulkOperationExecuteHandler,
  type BulkOperationExecutionDeps,
  type BulkOperationExecutionRecord
} from "./handlers";

const tenantData = {
  organizationId: "11111111-1111-4111-8111-111111111111",
  siteId: "22222222-2222-4222-8222-222222222222",
  operationId: "33333333-3333-4333-8333-333333333333"
};

function createOperation(
  overrides: Partial<BulkOperationExecutionRecord> = {}
): BulkOperationExecutionRecord {
  return {
    id: tenantData.operationId,
    organizationId: tenantData.organizationId,
    siteId: tenantData.siteId,
    status: "RUNNING",
    siteUrl: "https://wp.example.com",
    connection: {
      encryptedToken: "encrypted-token",
      disconnectedAt: null
    },
    items: [
      {
        id: "44444444-4444-4444-8444-444444444444",
        externalId: "post:123",
        status: "RUNNING",
        beforeValue: null,
        afterValue: {
          seoPlugin: "yoast",
          seoTitle: "Updated SEO title",
          robotsNoindex: false
        }
      }
    ],
    ...overrides
  };
}

function createDeps(operation: BulkOperationExecutionRecord | null = createOperation()) {
  const calls = {
    applyInputs: [] as Array<{
      siteUrl: string;
      path: string;
      body: string;
      headers: Record<string, string>;
    }>,
    recordedResults: [] as unknown[]
  };
  const deps: BulkOperationExecutionDeps = {
    loadOperation: (organizationId, siteId, operationId) =>
      Promise.resolve(
        organizationId === tenantData.organizationId &&
          siteId === tenantData.siteId &&
          operationId === tenantData.operationId
          ? operation
          : null
      ),
    decryptSecret: (value) => `decrypted:${value}`,
    applyToWordPress: (input) => {
      calls.applyInputs.push(input);
      const decoded = JSON.parse(input.body) as {
        operationId: string;
        siteId: string;
        items: Array<{ itemId: string; externalId: string }>;
      };

      return Promise.resolve({
        data: {
          operationId: decoded.operationId,
          siteId: decoded.siteId,
          appliedCount: decoded.items.length,
          failedCount: 0,
          results: decoded.items.map((item) => ({
            itemId: item.itemId,
            externalId: item.externalId,
            status: "COMPLETED",
            beforeValue: { seoPlugin: "yoast", seoTitle: "Old title" },
            afterValue: { seoPlugin: "yoast", seoTitle: "Updated SEO title" },
            error: null
          }))
        }
      });
    },
    recordResult: (input) => {
      calls.recordedResults.push(input);
      return Promise.resolve();
    },
    now: () => new Date("2026-07-09T12:00:00.000Z")
  };

  return { deps, calls };
}

describe("bulk operation execution handler", () => {
  it("signs an executable apply batch and records completed plugin results", async () => {
    const { deps, calls } = createDeps();
    const handler = createBulkOperationExecuteHandler(deps);

    const result = await handler({
      id: "job-1",
      name: "bulk-operation.execute",
      data: tenantData
    });

    expect(result).toEqual({
      pluginCalled: true,
      itemCount: 1,
      appliedItems: 1,
      failedItems: 0
    });
    expect(calls.applyInputs).toHaveLength(1);
    expect(calls.applyInputs[0]?.path).toBe("/wp-json/sccc/v1/operations/apply");
    expect(calls.applyInputs[0]?.headers["X-SCCC-Token"]).toBe("decrypted:encrypted-token");
    expect(calls.applyInputs[0]?.headers["X-SCCC-Signature"]).toEqual(expect.any(String));
    expect(calls.recordedResults[0]).toMatchObject({
      organizationId: tenantData.organizationId,
      siteId: tenantData.siteId,
      operationId: tenantData.operationId,
      status: "COMPLETED",
      itemResults: [
        {
          itemId: "44444444-4444-4444-8444-444444444444",
          externalId: "post:123",
          status: "COMPLETED",
          error: null
        }
      ]
    });
  });

  it("fails non-executable preview-only items without calling WordPress", async () => {
    const { deps, calls } = createDeps(
      createOperation({
        items: [
          {
            id: "44444444-4444-4444-8444-444444444444",
            externalId: "https://wp.example.com/page",
            status: "RUNNING",
            beforeValue: null,
            afterValue: {
              recommendedAction: "Update SEO title",
              noMutation: true
            }
          }
        ]
      })
    );
    const handler = createBulkOperationExecuteHandler(deps);

    const result = await handler({
      id: "job-1",
      name: "bulk-operation.execute",
      data: tenantData
    });

    expect(result).toMatchObject({
      pluginCalled: false,
      failedItems: 1
    });
    expect(calls.applyInputs).toEqual([]);
    expect(calls.recordedResults[0]).toMatchObject({
      status: "FAILED",
      itemResults: [
        {
          error: "invalid_external_id"
        }
      ]
    });
  });

  it("records failure when the connected plugin has no encrypted apply token", async () => {
    const { deps, calls } = createDeps(
      createOperation({
        connection: {
          encryptedToken: null,
          disconnectedAt: null
        }
      })
    );
    const handler = createBulkOperationExecuteHandler(deps);

    await handler({
      id: "job-1",
      name: "bulk-operation.execute",
      data: tenantData
    });

    expect(calls.applyInputs).toEqual([]);
    expect(calls.recordedResults[0]).toMatchObject({
      status: "FAILED",
      message: "Plugin apply secret is unavailable. Reconnect the WordPress plugin.",
      itemResults: [
        {
          error: "plugin_apply_secret_not_available"
        }
      ]
    });
  });

  it("rejects payloads without operation scope", async () => {
    const { deps } = createDeps();
    const handler = createBulkOperationExecuteHandler(deps);

    await expect(
      handler({
        id: "job-1",
        name: "bulk-operation.execute",
        data: {
          organizationId: tenantData.organizationId,
          siteId: tenantData.siteId
        }
      })
    ).rejects.toThrow();
  });
});
