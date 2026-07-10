import { describe, expect, it } from "vitest";

import { buildAuditIssueInputsFromSyncedContent } from "./audit-issue-generation";
import type { SyncedContentItem } from "./types";

const baseItem: SyncedContentItem = {
  id: "00000000-0000-4000-8000-000000000401",
  organizationId: "00000000-0000-4000-8000-000000000101",
  siteId: "00000000-0000-4000-8000-000000000201",
  externalId: "post:1",
  type: "post",
  url: "https://example.com/post",
  title: "Revenue guide",
  status: "publish",
  modifiedAt: "2026-06-29T12:00:00.000Z",
  metadata: {
    wordCount: 120,
    robotsNoindex: true,
    robotsNofollow: true,
    canonicalUrl: "https://example.com/preferred-post",
    internalLinkCount: 0,
    externalLinkCount: 0
  },
  firstSeenAt: "2026-06-29T12:00:00.000Z",
  lastSeenAt: "2026-07-01T10:00:00.000Z"
};

const referenceDate = new Date("2026-07-02T12:00:00.000Z");

describe("buildAuditIssueInputsFromSyncedContent", () => {
  it("materializes actionable synced content health signals as audit issues", () => {
    const issues = buildAuditIssueInputsFromSyncedContent(baseItem, referenceDate);

    expect(issues.map((issue) => [issue.issueType, issue.severity])).toEqual([
      ["synced_content.thin-content", "MEDIUM"],
      ["synced_content.seo-title-missing", "MEDIUM"],
      ["synced_content.meta-description-missing", "MEDIUM"],
      ["synced_content.robots-noindex", "HIGH"],
      ["synced_content.robots-nofollow", "MEDIUM"],
      ["synced_content.canonical-different", "MEDIUM"],
      ["synced_content.internal-links-missing", "MEDIUM"]
    ]);
    expect(issues[0]).toMatchObject({
      affectedUrl: "https://example.com/post",
      evidence: {
        source: "synced_content_health",
        contentItemId: baseItem.id,
        externalId: "post:1",
        signalId: "thin-content"
      },
      fingerprint: "synced_content:post:1:thin-content"
    });
  });
});
