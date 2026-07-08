import { describe, expect, it } from "vitest";

import { buildOnboardingChecklist } from "./onboarding-checklist";

describe("onboarding checklist", () => {
  it("starts with workspace creation when no organization exists", () => {
    const checklist = buildOnboardingChecklist({
      organization: null,
      activeSite: null,
      syncedContentTotal: 0,
      auditRunCount: 0,
      backlogTaskCount: 0
    });

    expect(checklist.completedCount).toBe(0);
    expect(checklist.progressPercent).toBe(0);
    expect(checklist.nextItem).toMatchObject({
      id: "workspace",
      status: "current"
    });
    expect(checklist.items.map((item) => item.status)).toEqual([
      "current",
      "upcoming",
      "upcoming",
      "upcoming",
      "upcoming",
      "upcoming"
    ]);
  });

  it("moves to plugin connection after a pending site is added", () => {
    const checklist = buildOnboardingChecklist({
      organization: {
        name: "Acme SEO",
        sites: [
          {
            id: "site-1",
            status: "PENDING_CONNECTION"
          }
        ]
      },
      activeSite: null,
      syncedContentTotal: 0,
      auditRunCount: 0,
      backlogTaskCount: 0
    });

    expect(checklist.completedCount).toBe(2);
    expect(checklist.nextItem).toMatchObject({
      id: "plugin",
      status: "current"
    });
  });

  it("marks the MVP path complete when content, audits, and backlog exist", () => {
    const checklist = buildOnboardingChecklist({
      organization: {
        name: "Acme SEO",
        sites: [
          {
            id: "site-1",
            status: "CONNECTED"
          }
        ]
      },
      activeSite: null,
      syncedContentTotal: 12,
      auditRunCount: 2,
      backlogTaskCount: 4
    });

    expect(checklist.completedCount).toBe(checklist.totalCount);
    expect(checklist.progressPercent).toBe(100);
    expect(checklist.nextItem).toBeNull();
    expect(checklist.items.every((item) => item.status === "complete")).toBe(true);
  });
});
