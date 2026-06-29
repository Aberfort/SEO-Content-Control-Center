import { describe, expect, it } from "vitest";

import { parseTenantScope, tenantCacheKey, tenantStoragePrefix } from "./tenant";

const organizationId = "11111111-1111-4111-8111-111111111111";
const siteId = "22222222-2222-4222-8222-222222222222";

describe("tenant helpers", () => {
  it("builds cache keys with organization and site scope", () => {
    expect(tenantCacheKey({ organizationId, siteId }, "audit/latest")).toBe(
      `org:${organizationId}:site:${siteId}:audit_latest`
    );
  });

  it("builds isolated storage prefixes", () => {
    expect(tenantStoragePrefix({ organizationId, siteId })).toBe(
      `organizations/${organizationId}/sites/${siteId}`
    );
  });

  it("rejects invalid tenant identifiers", () => {
    expect(() => parseTenantScope({ organizationId: "not-a-uuid" })).toThrow();
  });
});
