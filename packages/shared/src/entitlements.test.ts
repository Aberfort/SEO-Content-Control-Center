import { describe, expect, it } from "vitest";

import {
  assertEntitlement,
  canUseEntitlement,
  commercialCapabilityKeys,
  resolveCommercialAccess
} from "./entitlements";

describe("commercial entitlements", () => {
  it("names every feature and capacity controlled by a plan", () => {
    expect(commercialCapabilityKeys).toEqual([
      "sites",
      "users",
      "urlsPerSite",
      "gscImpact",
      "recurringReports",
      "contentTrustEvidence",
      "aiSummaries",
      "safeOperations",
      "apiAccess"
    ]);
  });

  it("keeps trial base data available while paid capabilities stay locked", () => {
    const access = resolveCommercialAccess({ planCode: "TRIAL", status: "TRIALING" });

    expect(access.mode).toBe("full");
    expect(access.limits).toMatchObject({ sites: 1, users: 2, urlsPerSite: 500 });
    expect(canUseEntitlement(access, "gscImpact")).toBe(false);
    expect(() => assertEntitlement(access, "safeOperations")).toThrow(
      "PLAN_SAFE_OPERATIONS_REQUIRED"
    );
  });

  it("unlocks the paid core on upgrade and AI summaries on Pro", () => {
    const starter = resolveCommercialAccess({ planCode: "STARTER", status: "ACTIVE" });
    const pro = resolveCommercialAccess({ planCode: "PRO", status: "ACTIVE" });

    expect(canUseEntitlement(starter, "contentTrustEvidence")).toBe(true);
    expect(canUseEntitlement(starter, "recurringReports")).toBe(true);
    expect(canUseEntitlement(starter, "aiSummaries")).toBe(false);
    expect(canUseEntitlement(pro, "aiSummaries")).toBe(true);
  });

  it("applies downgraded plan gates without revoking read access to retained records", () => {
    const access = resolveCommercialAccess({ planCode: "TRIAL", status: "ACTIVE" });

    expect(access.mode).toBe("full");
    expect(access.entitlements.contentTrustEvidence).toBe(false);
    expect(access.entitlements.safeOperations).toBe(false);
  });

  it("makes expired and payment-problem subscriptions read-only", () => {
    const expired = resolveCommercialAccess({
      planCode: "STARTER",
      status: "TRIALING",
      provider: null,
      trialEndsAt: "2026-08-01T00:00:00.000Z",
      now: new Date("2026-08-15T00:00:00.000Z")
    });
    const pastDue = resolveCommercialAccess({ planCode: "AGENCY", status: "PAST_DUE" });

    expect(expired.mode).toBe("read_only");
    expect(pastDue.entitlements.safeOperations).toBe(true);
    expect(canUseEntitlement(pastDue, "safeOperations")).toBe(false);
    expect(() => assertEntitlement(expired, "recurringReports")).toThrow("BILLING_READ_ONLY");
  });
});
