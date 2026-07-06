import { describe, expect, it } from "vitest";

import {
  buildSyncedContentBacklogCandidates,
  buildSyncedContentHealthSignals
} from "./content-health";
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
    wordCount: 1200
  },
  firstSeenAt: "2026-06-29T12:00:00.000Z",
  lastSeenAt: "2026-07-01T10:00:00.000Z"
};

describe("buildSyncedContentHealthSignals", () => {
  it("marks published recently synced content as healthy", () => {
    const signals = buildSyncedContentHealthSignals(baseItem, new Date("2026-07-01T12:00:00.000Z"));

    expect(signals.map((signal) => signal.id)).toEqual([
      "title-present",
      "published",
      "sync-fresh",
      "content-current",
      "word-count-ok"
    ]);
    expect(signals.every((signal) => signal.severity !== "critical")).toBe(true);
    expect(buildSyncedContentBacklogCandidates(baseItem, signals)).toEqual([]);
  });

  it("flags missing titles, unpublished status, stale sync, and old modified dates", () => {
    const signals = buildSyncedContentHealthSignals(
      {
        ...baseItem,
        title: null,
        status: "trash",
        modifiedAt: "2025-01-01T00:00:00.000Z",
        metadata: {
          wordCount: 120
        },
        lastSeenAt: "2026-06-01T00:00:00.000Z"
      },
      new Date("2026-07-01T12:00:00.000Z")
    );

    expect(signals.map((signal) => [signal.id, signal.severity])).toEqual([
      ["title-missing", "warning"],
      ["not-published", "critical"],
      ["sync-stale", "critical"],
      ["content-stale", "info"],
      ["thin-content", "warning"]
    ]);
  });

  it("turns actionable signals into backlog candidates", () => {
    const item = {
      ...baseItem,
      title: null,
      status: "trash",
      modifiedAt: "2025-01-01T00:00:00.000Z",
      metadata: {
        wordCount: 120
      },
      lastSeenAt: "2026-06-01T00:00:00.000Z"
    };
    const signals = buildSyncedContentHealthSignals(item, new Date("2026-07-01T12:00:00.000Z"));
    const candidates = buildSyncedContentBacklogCandidates(item, signals);

    expect(candidates.map((candidate) => [candidate.sourceSignalId, candidate.priority])).toEqual([
      ["title-missing", "medium"],
      ["not-published", "high"],
      ["sync-stale", "high"],
      ["content-stale", "low"],
      ["thin-content", "medium"]
    ]);
    expect(candidates[0]?.nextStep).toContain("run plugin sync again");
  });
});
