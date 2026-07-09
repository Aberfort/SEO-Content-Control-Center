import { describe, expect, it } from "vitest";

import {
  buildAssistantRecommendationFromBacklogTask,
  buildAssistantRecommendationsFromGscOpportunities,
  buildAssistantRecommendationsFromSyncedContent,
  buildAssistantRecommendationsFromTrafficLoss,
  sortAssistantRecommendations
} from "./assistant-recommendations";
import type { MatchedPageTrafficLossEntry } from "./gsc-content-matching";
import type { MatchedGscOpportunityEntry } from "./gsc-opportunities";
import type { BacklogTask, SyncedContentItem } from "./types";

describe("assistant recommendations", () => {
  it("enables safe preview actions for backlog task recommendations", () => {
    const now = "2026-07-05T12:00:00.000Z";
    const task: BacklogTask = {
      id: "task-1",
      organizationId: "org-1",
      siteId: "site-1",
      auditIssueId: null,
      title: "Update SEO title",
      url: "https://example.com/post",
      issueType: "missing_meta_title",
      status: "TODO",
      severity: "HIGH",
      potentialImpact: "Search snippets can underperform.",
      effortEstimate: 2,
      assigneeId: null,
      dueDate: null,
      tags: [],
      createdAt: now,
      updatedAt: now,
      comments: []
    };

    expect(buildAssistantRecommendationFromBacklogTask(task).action).toEqual({
      type: "safe_preview",
      label: "Prepare preview",
      enabled: true,
      requiresManualConfirmation: true,
      targetTaskId: "task-1",
      disabledReason: null
    });
  });

  it("disables safe preview actions for synced content recommendations", () => {
    const item: SyncedContentItem = {
      id: "content-1",
      organizationId: "org-1",
      siteId: "site-1",
      externalId: "wp-post-1",
      type: "post",
      url: "https://example.com/post",
      title: "",
      status: "publish",
      modifiedAt: "2020-01-01T00:00:00.000Z",
      metadata: {},
      firstSeenAt: "2020-01-01T00:00:00.000Z",
      lastSeenAt: "2020-01-01T00:00:00.000Z"
    };

    const recommendations = buildAssistantRecommendationsFromSyncedContent(item);

    expect(recommendations[0]?.action).toEqual({
      type: "safe_preview",
      label: "Prepare preview",
      enabled: false,
      requiresManualConfirmation: true,
      targetTaskId: null,
      disabledReason: "Create a backlog task before preparing a safe preview."
    });
  });
});

describe("assistant recommendations from gsc evidence", () => {
  const currentRange = { startDate: "2026-06-22", endDate: "2026-06-28" };
  const baselineRange = { startDate: "2026-06-15", endDate: "2026-06-21" };

  function drop(overrides: Partial<MatchedPageTrafficLossEntry> = {}): MatchedPageTrafficLossEntry {
    return {
      page: "https://example.com/hello",
      currentClicks: 30,
      baselineClicks: 100,
      clicksDelta: -70,
      dropRatio: 0.7,
      currentPosition: 6,
      baselinePosition: 4,
      content: {
        contentItemId: "content-1",
        externalId: "post:1",
        title: "Hello"
      },
      ...overrides
    };
  }

  function opportunity(
    overrides: Partial<MatchedGscOpportunityEntry> = {}
  ): MatchedGscOpportunityEntry {
    return {
      type: "ctr-opportunity",
      page: "https://example.com/hello",
      clicks: 4,
      impressions: 1000,
      ctr: 0.004,
      position: 3,
      expectedCtr: 0.11,
      content: {
        contentItemId: "content-1",
        externalId: "post:1",
        title: "Hello"
      },
      ...overrides
    };
  }

  it("builds read-only traffic loss recommendations with detection-derived priority", () => {
    const recommendations = buildAssistantRecommendationsFromTrafficLoss({
      organizationId: "org-1",
      siteId: "site-1",
      drops: [drop(), drop({ page: "https://example.com/medium", dropRatio: 0.3, content: null })],
      currentRange,
      baselineRange
    });

    expect(recommendations).toHaveLength(2);
    expect(recommendations[0]).toMatchObject({
      id: "gsc-loss:https://example.com/hello",
      title: "Investigate the click drop on Hello",
      priority: "high",
      noMutation: true,
      source: {
        type: "gsc_traffic_loss",
        label: "Hello",
        url: "https://example.com/hello",
        detail: "Clicks 100 to 30 (70% drop)"
      }
    });
    expect(recommendations[0]?.rationale).toContain("dropped 70%");
    expect(recommendations[0]?.nextStep).toContain("metadata audit");
    expect(recommendations[0]?.action).toMatchObject({
      type: "safe_preview",
      enabled: false,
      targetTaskId: null,
      disabledReason: "Create a backlog task for this drop before preparing a safe preview."
    });
    expect(recommendations[1]).toMatchObject({
      priority: "medium",
      source: { label: "https://example.com/medium" }
    });
    expect(recommendations[1]?.nextStep).toContain("Sync this page");
  });

  it("returns no traffic loss recommendations without comparison ranges", () => {
    expect(
      buildAssistantRecommendationsFromTrafficLoss({
        organizationId: "org-1",
        siteId: "site-1",
        drops: [drop()],
        currentRange: null,
        baselineRange
      })
    ).toEqual([]);
  });

  it("reuses opportunity candidate copy for matched entries", () => {
    const recommendations = buildAssistantRecommendationsFromGscOpportunities({
      organizationId: "org-1",
      siteId: "site-1",
      entries: [opportunity()]
    });

    expect(recommendations).toHaveLength(1);
    expect(recommendations[0]).toMatchObject({
      id: "gsc-opportunity:content-1:gsc-ctr-opportunity",
      title: "Improve search snippet for Hello",
      priority: "medium",
      noMutation: true,
      source: {
        type: "gsc_opportunity",
        id: "content-1:gsc-ctr-opportunity",
        label: "Hello",
        url: "https://example.com/hello",
        detail: "Position 3 / CTR 0.4% vs 11% benchmark / 1,000 impressions"
      }
    });
    expect(recommendations[0]?.action).toMatchObject({
      enabled: false,
      disabledReason: "Create a backlog task from this opportunity before preparing a safe preview."
    });
  });

  it("keeps unmatched opportunities visible with a sync-first next step", () => {
    const recommendations = buildAssistantRecommendationsFromGscOpportunities({
      organizationId: "org-1",
      siteId: "site-1",
      entries: [
        opportunity({
          type: "striking-distance",
          page: "https://example.com/unmatched",
          position: 12,
          impressions: 400,
          expectedCtr: null,
          content: null
        })
      ]
    });

    expect(recommendations[0]).toMatchObject({
      id: "gsc-opportunity:striking-distance:https://example.com/unmatched",
      title: "Push https://example.com/unmatched into top positions",
      priority: "medium",
      source: {
        type: "gsc_opportunity",
        detail: "Position 12 / 400 impressions"
      }
    });
    expect(recommendations[0]?.nextStep).toContain("Sync this page");
    expect(recommendations[0]?.action.disabledReason).toContain("Sync this page");
  });

  it("ranks gsc sources after backlog and synced content at equal priority", () => {
    const backlogTask: BacklogTask = {
      id: "task-1",
      organizationId: "org-1",
      siteId: "site-1",
      auditIssueId: null,
      title: "A backlog task",
      url: "https://example.com/post",
      issueType: "missing_meta_title",
      status: "TODO",
      severity: "MEDIUM",
      potentialImpact: null,
      effortEstimate: 2,
      assigneeId: null,
      dueDate: null,
      tags: [],
      createdAt: "2026-07-05T12:00:00.000Z",
      updatedAt: "2026-07-05T12:00:00.000Z",
      comments: []
    };
    const sorted = sortAssistantRecommendations([
      ...buildAssistantRecommendationsFromGscOpportunities({
        organizationId: "org-1",
        siteId: "site-1",
        entries: [opportunity()]
      }),
      ...buildAssistantRecommendationsFromTrafficLoss({
        organizationId: "org-1",
        siteId: "site-1",
        drops: [drop({ dropRatio: 0.3 })],
        currentRange,
        baselineRange
      }),
      buildAssistantRecommendationFromBacklogTask(backlogTask)
    ]);

    expect(sorted.map((recommendation) => recommendation.source.type)).toEqual([
      "backlog_task",
      "gsc_traffic_loss",
      "gsc_opportunity"
    ]);
  });
});
