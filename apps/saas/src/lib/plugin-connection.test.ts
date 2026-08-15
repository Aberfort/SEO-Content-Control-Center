import { describe, expect, it } from "vitest";

import { signPluginRequest } from "@sccc/shared";

import {
  assertSyncedUrlCapacity,
  hashPluginToken,
  preserveAcceptedLocalFindings
} from "./plugin-connection";

describe("plugin connection signing", () => {
  it("matches the WordPress plugin request signing payload format", () => {
    const body = '{"siteId":"22222222-2222-4222-8222-222222222222"}';
    const signature = signPluginRequest({
      method: "POST",
      path: "/api/plugin/sync",
      timestamp: 1_735_689_600,
      body,
      secret: "secret"
    });

    expect(signature).toBe("401771bd7fa9f6ae0935be381a1cd0de7f04415a662f7ebed156fde287bc8482");
  });

  it("hashes plugin tokens without exposing the raw token", () => {
    expect(hashPluginToken("secret")).toBe(
      "2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b"
    );
  });

  it("preserves completed local evidence when an incomplete audit omits the field", () => {
    const previous = [
      {
        code: "orphan-content",
        fingerprint: "a".repeat(64)
      }
    ];

    expect(preserveAcceptedLocalFindings({ wordCount: 400 }, { localFindings: previous })).toEqual({
      wordCount: 400,
      localFindings: previous
    });
    expect(
      preserveAcceptedLocalFindings(
        { wordCount: 400, localFindings: [] },
        { localFindings: previous }
      )
    ).toEqual({ wordCount: 400, localFindings: [] });
  });

  it("counts only new unique URLs against the synced URL limit", () => {
    expect(() =>
      assertSyncedUrlCapacity({
        existingCount: 499,
        existingExternalIds: ["post:1"],
        incomingExternalIds: ["post:1", "post:2", "post:2"],
        limit: 500
      })
    ).not.toThrow();

    expect(() =>
      assertSyncedUrlCapacity({
        existingCount: 500,
        existingExternalIds: ["post:1"],
        incomingExternalIds: ["post:1", "post:2"],
        limit: 500
      })
    ).toThrow("PLAN_URL_LIMIT_REACHED");
  });
});
