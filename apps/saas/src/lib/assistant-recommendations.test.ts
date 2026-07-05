import { describe, expect, it } from "vitest";

import {
  buildAssistantRecommendationFromBacklogTask,
  buildAssistantRecommendationsFromSyncedContent
} from "./assistant-recommendations";
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
