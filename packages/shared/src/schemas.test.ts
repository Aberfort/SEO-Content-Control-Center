import { describe, expect, it } from "vitest";

import { pluginSyncMetadataSchema } from "./schemas";

describe("pluginSyncMetadataSchema", () => {
  it("accepts a bounded local audit finding contract", () => {
    const parsed = pluginSyncMetadataSchema.parse({
      localFindings: [
        {
          code: "orphan-content",
          label: "No inbound internal links",
          severity: "warning",
          evidence: "No published page in the completed local graph links here.",
          fingerprint: "a".repeat(64)
        }
      ]
    });

    expect(parsed.localFindings?.[0]?.code).toBe("orphan-content");
  });

  it("rejects unknown local finding codes and fields", () => {
    expect(() =>
      pluginSyncMetadataSchema.parse({
        localFindings: [
          {
            code: "arbitrary-finding",
            label: "Unknown",
            severity: "warning",
            evidence: "Unknown evidence",
            fingerprint: "b".repeat(64),
            postBody: "must not cross the sync boundary"
          }
        ]
      })
    ).toThrow();
  });

  it("limits local findings per content item", () => {
    const finding = {
      code: "thin-content" as const,
      label: "Thin content",
      severity: "opportunity" as const,
      evidence: "Below the local review threshold.",
      fingerprint: "c".repeat(64)
    };

    expect(() =>
      pluginSyncMetadataSchema.parse({ localFindings: Array.from({ length: 33 }, () => finding) })
    ).toThrow();
  });
});
