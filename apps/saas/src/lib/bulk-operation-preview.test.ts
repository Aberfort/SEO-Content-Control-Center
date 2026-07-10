import { describe, expect, it } from "vitest";

import {
  buildBulkOperationDryRunPreviewResult,
  buildSafeOperationPreview,
  countExecutableSafeOperationItems
} from "./bulk-operation-preview";
import type { BacklogTask, SyncedContentItem } from "./types";

describe("safe bulk operation preview payloads", () => {
  it("builds an executable Yoast SEO title payload from synced content evidence", () => {
    const result = buildSafeOperationPreview({
      task: buildTask({
        title: "Add an SEO title",
        issueType: "synced_content.seo-title-missing",
        url: "https://example.com/technical-seo"
      }),
      syncedContentItem: buildSyncedContentItem({
        externalId: "post:42",
        title: "Guide to Technical SEO",
        url: "https://example.com/technical-seo",
        metadata: {
          seoPlugin: "yoast",
          seoTitle: null,
          metaDescription: "Existing description"
        }
      })
    });

    expect(result.preview).toMatchObject({
      noMutation: false,
      executable: true,
      contentExternalId: "post:42"
    });
    expect(result.item).toMatchObject({
      externalId: "post:42",
      afterValue: {
        seoPlugin: "yoast",
        seoTitle: "Guide to Technical SEO"
      }
    });
    expect(countExecutableSafeOperationItems([result.item])).toBe(1);
  });

  it("builds an executable Rank Math meta description payload for audit-backed tasks", () => {
    const result = buildSafeOperationPreview({
      task: buildTask({
        title: "Write a focused meta description",
        issueType: "audit.synced_content.meta-description-missing",
        url: "https://example.com/content-ops-playbook"
      }),
      syncedContentItem: buildSyncedContentItem({
        externalId: "page:77",
        title: "Content Operations Playbook",
        url: "https://example.com/content-ops-playbook",
        metadata: {
          seoPlugin: "rank_math",
          seoTitle: "Content Operations Playbook",
          metaDescription: null
        }
      })
    });

    expect(result.item.afterValue).toMatchObject({
      seoPlugin: "rank_math",
      metaDescription:
        "Review Content Operations Playbook for practical guidance, key details, and next steps."
    });
    expect(String(result.item.afterValue.metaDescription).length).toBeLessThanOrEqual(155);
    expect(
      buildBulkOperationDryRunPreviewResult({
        operationId: "operation-1",
        type: "BACKLOG_TASK_PREVIEW",
        itemCount: 1,
        executableItems: countExecutableSafeOperationItems([result.item]),
        checkedAt: "2026-07-09T08:00:00.000Z"
      })
    ).toMatchObject({
      noMutation: false,
      executableItems: 1,
      checks: expect.arrayContaining(["plugin_apply_payload_present", "wordpress_write_deferred"])
    });
  });

  it("restores a mismatched canonical to the synced item URL after review", () => {
    const result = buildSafeOperationPreview({
      task: buildTask({
        title: "Review canonical target",
        issueType: "audit.synced_content.canonical-different",
        url: "https://example.com/canonical-page"
      }),
      syncedContentItem: buildSyncedContentItem({
        externalId: "post:88",
        url: "https://example.com/canonical-page",
        metadata: {
          seoPlugin: "yoast",
          canonicalUrl: "https://example.com/legacy-canonical/"
        }
      })
    });

    expect(result.preview).toMatchObject({
      noMutation: false,
      executable: true,
      beforeValue: {
        canonicalUrl: "https://example.com/legacy-canonical/"
      }
    });
    expect(result.item.afterValue).toEqual({
      seoPlugin: "yoast",
      canonicalUrl: "https://example.com/canonical-page"
    });
  });

  it("removes only the reviewed robots directive that the synced metadata still enables", () => {
    const syncedContentItem = buildSyncedContentItem({
      externalId: "page:89",
      url: "https://example.com/robots-page",
      metadata: {
        seoPlugin: "rank_math",
        robotsNoindex: true,
        robotsNofollow: true
      }
    });
    const noindex = buildSafeOperationPreview({
      task: buildTask({
        issueType: "synced_content.robots-noindex",
        url: syncedContentItem.url
      }),
      syncedContentItem
    });
    const nofollow = buildSafeOperationPreview({
      task: buildTask({
        issueType: "synced_content.robots-nofollow",
        url: syncedContentItem.url
      }),
      syncedContentItem
    });

    expect(noindex.item.afterValue).toEqual({ seoPlugin: "rank_math", robotsNoindex: false });
    expect(nofollow.item.afterValue).toEqual({ seoPlugin: "rank_math", robotsNofollow: false });
    expect(countExecutableSafeOperationItems([noindex.item, nofollow.item])).toBe(2);
  });

  it("keeps stale canonical and robots tasks preview-only", () => {
    const canonical = buildSafeOperationPreview({
      task: buildTask({
        issueType: "synced_content.canonical-different",
        url: "https://example.com/current"
      }),
      syncedContentItem: buildSyncedContentItem({
        externalId: "post:90",
        url: "https://example.com/current",
        metadata: {
          seoPlugin: "yoast",
          canonicalUrl: "https://example.com/current/"
        }
      })
    });
    const robots = buildSafeOperationPreview({
      task: buildTask({
        issueType: "synced_content.robots-noindex",
        url: "https://example.com/current"
      }),
      syncedContentItem: buildSyncedContentItem({
        externalId: "post:91",
        url: "https://example.com/current",
        metadata: {
          seoPlugin: "yoast",
          robotsNoindex: false
        }
      })
    });

    expect(canonical.preview.executionDisabledReason).toBe(
      "synced_content_canonical_already_matches_item"
    );
    expect(robots.preview.executionDisabledReason).toBe(
      "synced_content_robots_noindex_not_enabled"
    );
    expect(countExecutableSafeOperationItems([canonical.item, robots.item])).toBe(0);
  });

  it("keeps canonical and robots repairs preview-only for non-published or unsafe URLs", () => {
    const draftCanonical = buildSafeOperationPreview({
      task: buildTask({
        issueType: "synced_content.canonical-different",
        url: "https://example.com/draft"
      }),
      syncedContentItem: buildSyncedContentItem({
        externalId: "post:92",
        url: "https://example.com/draft",
        status: "draft",
        metadata: {
          seoPlugin: "yoast",
          canonicalUrl: "https://example.com/old-draft"
        }
      })
    });
    const unsafeCanonical = buildSafeOperationPreview({
      task: buildTask({
        issueType: "synced_content.canonical-different",
        url: "mailto:editor@example.com"
      }),
      syncedContentItem: buildSyncedContentItem({
        externalId: "post:93",
        url: "mailto:editor@example.com",
        metadata: {
          seoPlugin: "yoast",
          canonicalUrl: "https://example.com/legacy"
        }
      })
    });
    const draftRobots = buildSafeOperationPreview({
      task: buildTask({
        issueType: "synced_content.robots-nofollow",
        url: "https://example.com/private"
      }),
      syncedContentItem: buildSyncedContentItem({
        externalId: "page:94",
        url: "https://example.com/private",
        status: "private",
        metadata: {
          seoPlugin: "rank_math",
          robotsNofollow: true
        }
      })
    });

    expect(draftCanonical.preview.executionDisabledReason).toBe("synced_content_not_published");
    expect(unsafeCanonical.preview.executionDisabledReason).toBe(
      "synced_content_url_not_safe_for_canonical"
    );
    expect(draftRobots.preview.executionDisabledReason).toBe("synced_content_not_published");
    expect(
      countExecutableSafeOperationItems([
        draftCanonical.item,
        unsafeCanonical.item,
        draftRobots.item
      ])
    ).toBe(0);
  });

  it("keeps unsupported or missing synced content as preview-only", () => {
    const task = buildTask({
      issueType: "missing_meta_title",
      url: "https://example.com/legacy-preview"
    });
    const missingSyncedContent = buildSafeOperationPreview({
      task,
      syncedContentItem: null
    });
    const fallbackPlugin = buildSafeOperationPreview({
      task,
      syncedContentItem: buildSyncedContentItem({
        externalId: "post:9",
        title: "Legacy Preview",
        url: "https://example.com/legacy-preview",
        metadata: {
          seoPlugin: "fallback",
          seoTitle: null,
          metaDescription: null
        }
      })
    });

    expect(missingSyncedContent.preview).toMatchObject({
      noMutation: true,
      executable: false,
      executionDisabledReason: "synced_content_item_not_found"
    });
    expect(fallbackPlugin.preview).toMatchObject({
      noMutation: true,
      executable: false,
      executionDisabledReason: "unsupported_seo_plugin"
    });
    expect(fallbackPlugin.item).toMatchObject({
      externalId: task.url,
      afterValue: {
        noMutation: true,
        nextRequiredStep: "dry_run"
      }
    });
    expect(
      countExecutableSafeOperationItems([missingSyncedContent.item, fallbackPlugin.item])
    ).toBe(0);
  });
});

function buildTask(overrides: Partial<BacklogTask> = {}): BacklogTask {
  return {
    id: "00000000-0000-4000-8000-000000000401",
    organizationId: "00000000-0000-4000-8000-000000000101",
    siteId: "00000000-0000-4000-8000-000000000201",
    auditIssueId: null,
    title: "Add an SEO title",
    url: "https://example.com/page",
    issueType: "missing_meta_title",
    status: "TODO",
    severity: "HIGH",
    potentialImpact: "Search snippets can underperform.",
    effortEstimate: 2,
    assigneeId: null,
    dueDate: null,
    tags: [],
    createdAt: "2026-07-09T07:00:00.000Z",
    updatedAt: "2026-07-09T07:00:00.000Z",
    comments: [],
    activityLogs: [],
    ...overrides
  };
}

function buildSyncedContentItem(overrides: Partial<SyncedContentItem> = {}): SyncedContentItem {
  return {
    id: "00000000-0000-4000-8000-000000000501",
    organizationId: "00000000-0000-4000-8000-000000000101",
    siteId: "00000000-0000-4000-8000-000000000201",
    externalId: "post:1",
    type: "post",
    url: "https://example.com/page",
    title: "Example Page",
    status: "publish",
    modifiedAt: "2026-07-09T06:00:00.000Z",
    metadata: {},
    firstSeenAt: "2026-07-09T06:00:00.000Z",
    lastSeenAt: "2026-07-09T06:30:00.000Z",
    ...overrides
  };
}
