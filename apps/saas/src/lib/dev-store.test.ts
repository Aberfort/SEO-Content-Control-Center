import { describe, expect, it, beforeEach } from "vitest";

import {
  addMemberForTest,
  canAccessOrganization,
  createOrganization,
  createSite,
  getBillingCheckoutContext,
  getBillingPortalContext,
  getOrganizationSummary,
  listOrganizationSummariesForUser,
  resetDevStore
} from "./dev-store";
import type { AppUser } from "./types";

const owner: AppUser = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "owner@example.com",
  name: "Owner"
};

const viewer: AppUser = {
  id: "00000000-0000-4000-8000-000000000002",
  email: "viewer@example.com",
  name: "Viewer"
};

const outsider: AppUser = {
  id: "00000000-0000-4000-8000-000000000003",
  email: "outsider@example.com",
  name: "Outsider"
};

describe("dev store tenant access", () => {
  beforeEach(() => {
    resetDevStore();
  });

  it("creates an organization with owner membership and audit log", () => {
    const organization = createOrganization({ user: owner, name: "Acme SEO" });

    expect(organization.role).toBe("OWNER");
    expect(organization.slug).toBe("acme-seo");
    expect(organization.activityLogs).toHaveLength(1);
    expect(organization.activityLogs[0]?.action).toBe("organization.created");
  });

  it("isolates organizations from non-members", () => {
    const organization = createOrganization({ user: owner, name: "Acme SEO" });

    expect(listOrganizationSummariesForUser(outsider)).toEqual([]);
    expect(() => getOrganizationSummary(outsider.id, organization.id)).toThrow(
      "ORGANIZATION_NOT_FOUND"
    );
  });

  it("allows owners to create tenant-scoped sites", () => {
    const organization = createOrganization({ user: owner, name: "Acme SEO" });
    const site = createSite({
      user: owner,
      organizationId: organization.id,
      name: "Main Blog",
      url: "https://example.com/"
    });
    const summary = getOrganizationSummary(owner.id, organization.id);

    expect(site.url).toBe("https://example.com/");
    expect(summary?.sites).toHaveLength(1);
    expect(summary?.activityLogs.map((log) => log.action)).toContain("site.created");
  });

  it("blocks viewers from creating sites", () => {
    const organization = createOrganization({ user: owner, name: "Acme SEO" });
    addMemberForTest({
      organizationId: organization.id,
      userId: viewer.id,
      role: "VIEWER"
    });

    expect(canAccessOrganization(viewer.id, organization.id, "site:create")).toBe(false);
    expect(() =>
      createSite({
        user: viewer,
        organizationId: organization.id,
        name: "Viewer Site",
        url: "https://viewer.example.com"
      })
    ).toThrow("Role VIEWER cannot perform site:create");
  });

  it("requires billing management access before preparing checkout context", () => {
    const organization = createOrganization({ user: owner, name: "Acme SEO" });
    addMemberForTest({
      organizationId: organization.id,
      userId: viewer.id,
      role: "VIEWER"
    });

    expect(
      getBillingCheckoutContext({
        user: owner,
        organizationId: organization.id,
        planCode: "PRO"
      })
    ).toMatchObject({
      organizationId: organization.id,
      userEmail: owner.email,
      currentPlan: {
        code: "TRIAL"
      },
      targetPlan: {
        code: "PRO"
      }
    });
    expect(() =>
      getBillingCheckoutContext({
        user: viewer,
        organizationId: organization.id,
        planCode: "PRO"
      })
    ).toThrow("Role VIEWER cannot perform billing:manage");
    expect(() =>
      getBillingPortalContext({
        user: owner,
        organizationId: organization.id
      })
    ).toThrow("BILLING_SUBSCRIPTION_NOT_FOUND");
    expect(() =>
      getBillingPortalContext({
        user: viewer,
        organizationId: organization.id
      })
    ).toThrow("Role VIEWER cannot perform billing:manage");
  });

  it("deduplicates site URLs inside an organization", () => {
    const organization = createOrganization({ user: owner, name: "Acme SEO" });

    createSite({
      user: owner,
      organizationId: organization.id,
      name: "Main Blog",
      url: "https://example.com/"
    });

    expect(() =>
      createSite({
        user: owner,
        organizationId: organization.id,
        name: "Main Blog Duplicate",
        url: "https://example.com"
      })
    ).toThrow("SITE_ALREADY_EXISTS");
  });
});
