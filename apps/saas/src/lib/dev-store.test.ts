import { describe, expect, it, beforeEach } from "vitest";

import {
  addMemberForTest,
  canAccessOrganization,
  createAuditForSite,
  createOrganization,
  createSite,
  getBillingOverviewForOrganization,
  getBillingCheckoutContext,
  getBillingPortalContext,
  getDevStore,
  getOrganizationSummary,
  inviteMember,
  listAssistantRecommendationsForSite,
  listAuditIssuesForAudit,
  listOrganizationSummariesForUser,
  resetDevStore,
  updateAuditIssueStatus,
  upsertAuditIssuesByFingerprint
} from "./dev-store";
import { buildAuditIssueInputsFromTrafficLoss } from "./gsc-traffic-loss-issues";
import type { AppUser, GscSearchInsight } from "./types";

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
    expect(organization.activityLogs.map((log) => log.action)).toEqual(
      expect.arrayContaining(["organization.created", "billing.trial_started"])
    );
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
    ).toThrow("BILLING_PROVIDER_NOT_CONFIGURED");
    expect(() =>
      getBillingPortalContext({
        user: viewer,
        organizationId: organization.id
      })
    ).toThrow("Role VIEWER cannot perform billing:manage");
  });

  it("blocks gated mutations after a local trial expires", () => {
    const organization = createOrganization({ user: owner, name: "Expired Trial SEO" });
    const store = getDevStore();
    const subscription = store.subscriptions.find(
      (candidate) => candidate.organizationId === organization.id
    );

    expect(subscription).toBeDefined();
    subscription!.trialEndsAt = "2026-01-01T00:00:00.000Z";
    subscription!.currentPeriodEnd = "2026-01-01T00:00:00.000Z";

    const overview = getBillingOverviewForOrganization(owner.id, organization.id);

    expect(overview.subscription).toMatchObject({
      status: "PAST_DUE",
      provider: null
    });
    expect(overview.featureGates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "sites",
          allowed: false,
          disabledCode: "BILLING_TRIAL_EXPIRED"
        }),
        expect.objectContaining({
          key: "users",
          allowed: false,
          disabledReason: "Trial period has expired. Upgrade to continue."
        })
      ])
    );
    expect(() =>
      createSite({
        user: owner,
        organizationId: organization.id,
        name: "Expired Trial Site",
        url: "https://expired.example.com"
      })
    ).toThrow("BILLING_TRIAL_EXPIRED");
    expect(() =>
      inviteMember({
        user: owner,
        organizationId: organization.id,
        email: "expired-viewer@example.com",
        role: "VIEWER"
      })
    ).toThrow("BILLING_TRIAL_EXPIRED");
    expect(
      getBillingCheckoutContext({
        user: owner,
        organizationId: organization.id,
        planCode: "PRO"
      })
    ).toMatchObject({
      currentPlan: {
        code: "TRIAL"
      },
      subscription: {
        status: "PAST_DUE"
      },
      targetPlan: {
        code: "PRO"
      }
    });
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

describe("dev store audit traffic loss issues", () => {
  beforeEach(() => {
    resetDevStore();
  });

  function insight(overrides: Partial<GscSearchInsight> & { siteId: string }): GscSearchInsight {
    return {
      id: crypto.randomUUID(),
      propertyUrl: "sc-domain:example.com",
      startDate: "2026-06-22",
      endDate: "2026-06-28",
      page: "https://example.com/hello",
      query: "hello",
      clicks: 100,
      impressions: 1000,
      ctr: 0.1,
      position: 4,
      syncedAt: "2026-06-29T00:00:00.000Z",
      ...overrides
    };
  }

  it("creates audits without traffic loss issues while synced content is not persisted", () => {
    const organization = createOrganization({ user: owner, name: "Acme SEO" });
    const site = createSite({
      user: owner,
      organizationId: organization.id,
      name: "Main Blog",
      url: "https://example.com"
    });

    getDevStore().gscSearchInsights.push(
      insight({ siteId: site.id, clicks: 20 }),
      insight({
        siteId: site.id,
        startDate: "2026-06-15",
        endDate: "2026-06-21",
        clicks: 100,
        syncedAt: "2026-06-22T00:00:00.000Z"
      })
    );

    const audit = createAuditForSite({
      user: owner,
      organizationId: organization.id,
      siteId: site.id
    });

    expect(audit.issueSummary.total).toBe(0);
    const queuedLog = getDevStore().activityLogs.find(
      (log) => log.action === "audit.queued" && log.entityId === audit.id
    );
    expect(queuedLog?.metadata).toMatchObject({ generatedIssueCount: 0 });
  });

  it("upserts traffic loss issues by fingerprint across repeated audit runs", () => {
    const organization = createOrganization({ user: owner, name: "Acme SEO" });
    const site = createSite({
      user: owner,
      organizationId: organization.id,
      name: "Main Blog",
      url: "https://example.com"
    });
    const issues = buildAuditIssueInputsFromTrafficLoss({
      drops: [
        {
          page: "https://example.com/hello",
          currentClicks: 20,
          baselineClicks: 100,
          clicksDelta: -80,
          dropRatio: 0.8,
          currentPosition: 6,
          baselinePosition: 4,
          content: { contentItemId: "content-1", externalId: "post:1", title: "Hello" }
        }
      ],
      currentRange: { startDate: "2026-06-22", endDate: "2026-06-28" },
      baselineRange: { startDate: "2026-06-15", endDate: "2026-06-21" },
      propertyUrl: "sc-domain:example.com"
    });

    const firstAudit = createAuditForSite({
      user: owner,
      organizationId: organization.id,
      siteId: site.id
    });
    upsertAuditIssuesByFingerprint(getDevStore(), firstAudit, issues);

    const persisted = listAuditIssuesForAudit(owner.id, organization.id, site.id, firstAudit.id);
    expect(persisted).toHaveLength(1);
    expect(persisted[0]).toMatchObject({
      issueType: "gsc.traffic-loss",
      status: "OPEN",
      severity: "HIGH",
      affectedUrl: "https://example.com/hello",
      fingerprint: "gsc:traffic-loss:post:1"
    });

    updateAuditIssueStatus({
      user: owner,
      organizationId: organization.id,
      siteId: site.id,
      auditId: firstAudit.id,
      issueId: persisted[0]!.id,
      status: "RESOLVED"
    });

    const secondAudit = createAuditForSite({
      user: owner,
      organizationId: organization.id,
      siteId: site.id
    });
    upsertAuditIssuesByFingerprint(getDevStore(), secondAudit, issues);

    const allMatching = getDevStore().auditIssues.filter(
      (issue) => issue.fingerprint === "gsc:traffic-loss:post:1"
    );
    expect(allMatching).toHaveLength(1);

    const updated = listAuditIssuesForAudit(owner.id, organization.id, site.id, secondAudit.id, {
      status: "RESOLVED"
    });
    expect(updated).toHaveLength(1);
    expect(updated[0]).toMatchObject({ id: persisted[0]!.id, status: "RESOLVED" });
  });
});

describe("dev store assistant gsc recommendations", () => {
  beforeEach(() => {
    resetDevStore();
  });

  it("surfaces read-only traffic loss and opportunity recommendations from seeded insights", () => {
    const organization = createOrganization({ user: owner, name: "Acme SEO" });
    const site = createSite({
      user: owner,
      organizationId: organization.id,
      name: "Main Blog",
      url: "https://example.com"
    });

    getDevStore().gscSearchInsights.push(
      {
        id: crypto.randomUUID(),
        siteId: site.id,
        propertyUrl: "sc-domain:example.com",
        startDate: "2026-06-22",
        endDate: "2026-06-28",
        page: "https://example.com/hello",
        query: "hello",
        clicks: 2,
        impressions: 1000,
        ctr: 0.002,
        position: 6,
        syncedAt: "2026-06-29T00:00:00.000Z"
      },
      {
        id: crypto.randomUUID(),
        siteId: site.id,
        propertyUrl: "sc-domain:example.com",
        startDate: "2026-06-15",
        endDate: "2026-06-21",
        page: "https://example.com/hello",
        query: "hello",
        clicks: 100,
        impressions: 1000,
        ctr: 0.1,
        position: 4,
        syncedAt: "2026-06-22T00:00:00.000Z"
      }
    );

    const list = listAssistantRecommendationsForSite(owner.id, organization.id, site.id, {
      limit: 5
    });
    const sourceTypes = list.recommendations.map((recommendation) => recommendation.source.type);

    expect(sourceTypes).toEqual(["gsc_traffic_loss", "gsc_opportunity", "gsc_opportunity"]);
    expect(list.recommendations[0]).toMatchObject({
      priority: "high",
      noMutation: true,
      source: {
        url: "https://example.com/hello",
        detail: "Clicks 100 to 2 (98% drop)"
      }
    });
    expect(
      list.recommendations.every(
        (recommendation) =>
          recommendation.action.enabled === false &&
          recommendation.action.type === "safe_preview" &&
          recommendation.noMutation === true
      )
    ).toBe(true);
    expect(list.recommendations[1]?.nextStep).toContain("Sync this page");
  });

  it("keeps backlog-sourced recommendations first and preview-enabled", () => {
    const organization = createOrganization({ user: owner, name: "Acme SEO" });
    const site = createSite({
      user: owner,
      organizationId: organization.id,
      name: "Main Blog",
      url: "https://example.com"
    });
    const now = "2026-07-09T00:00:00.000Z";

    getDevStore().backlogTasks.push({
      id: "00000000-0000-4000-8000-000000000404",
      organizationId: organization.id,
      siteId: site.id,
      auditIssueId: null,
      title: "Update SEO title",
      url: "https://example.com/hello",
      issueType: "missing_meta_title",
      status: "TODO",
      severity: "CRITICAL",
      potentialImpact: null,
      effortEstimate: 2,
      assigneeId: null,
      dueDate: null,
      tags: [],
      createdAt: now,
      updatedAt: now,
      comments: []
    });
    getDevStore().gscSearchInsights.push({
      id: crypto.randomUUID(),
      siteId: site.id,
      propertyUrl: "sc-domain:example.com",
      startDate: "2026-06-22",
      endDate: "2026-06-28",
      page: "https://example.com/hello",
      query: "hello",
      clicks: 2,
      impressions: 1000,
      ctr: 0.002,
      position: 6,
      syncedAt: "2026-06-29T00:00:00.000Z"
    });

    const list = listAssistantRecommendationsForSite(owner.id, organization.id, site.id, {
      limit: 5
    });

    expect(list.recommendations[0]).toMatchObject({
      source: { type: "backlog_task" },
      action: { enabled: true }
    });
    expect(
      list.recommendations
        .filter((recommendation) => recommendation.source.type !== "backlog_task")
        .every((recommendation) => recommendation.action.enabled === false)
    ).toBe(true);
  });
});
