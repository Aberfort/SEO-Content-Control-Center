import { describe, expect, it } from "vitest";

import {
  buildContentUrlIndex,
  matchContentByUrl,
  matchTrafficLossPages,
  normalizeContentUrl,
  type SyncedContentUrlEntry
} from "./gsc-content-matching";
import type { PageTrafficLossEntry } from "./gsc-traffic-loss";

function entry(
  id: string,
  externalId: string,
  url: string,
  title: string | null = null
): SyncedContentUrlEntry {
  return { id, externalId, url, title };
}

function drop(page: string): PageTrafficLossEntry {
  return {
    page,
    currentClicks: 10,
    baselineClicks: 100,
    clicksDelta: -90,
    dropRatio: 0.9,
    currentPosition: 4,
    baselinePosition: 4
  };
}

describe("normalizeContentUrl", () => {
  it("ignores protocol, www, trailing slashes, query strings, and fragments", () => {
    const expected = "example.com/post";

    expect(normalizeContentUrl("https://www.example.com/post/")).toBe(expected);
    expect(normalizeContentUrl("http://example.com/post")).toBe(expected);
    expect(normalizeContentUrl("https://EXAMPLE.com/post?utm_source=x#section")).toBe(expected);
  });

  it("keeps different paths distinct and preserves path case", () => {
    expect(normalizeContentUrl("https://example.com/post-a")).not.toBe(
      normalizeContentUrl("https://example.com/post-b")
    );
    expect(normalizeContentUrl("https://example.com/Post")).toBe("example.com/Post");
  });

  it("normalizes the site root to a single slash", () => {
    expect(normalizeContentUrl("https://example.com")).toBe("example.com/");
    expect(normalizeContentUrl("https://example.com/")).toBe("example.com/");
  });

  it("rejects invalid and non-http urls", () => {
    expect(normalizeContentUrl("not a url")).toBeNull();
    expect(normalizeContentUrl("ftp://example.com/file")).toBeNull();
    expect(normalizeContentUrl("  ")).toBeNull();
  });
});

describe("buildContentUrlIndex", () => {
  it("indexes items by normalized url", () => {
    const index = buildContentUrlIndex([entry("id-1", "post:1", "https://www.example.com/hello/")]);

    expect(index.get("example.com/hello")).toMatchObject({ id: "id-1" });
  });

  it("resolves collisions deterministically by external id order", () => {
    const index = buildContentUrlIndex([
      entry("id-2", "post:2", "https://example.com/dup"),
      entry("id-1", "post:1", "https://www.example.com/dup/")
    ]);

    expect(index.get("example.com/dup")).toMatchObject({ id: "id-1", externalId: "post:1" });
  });

  it("skips items with unparseable urls", () => {
    expect(buildContentUrlIndex([entry("id-1", "post:1", "not a url")]).size).toBe(0);
  });
});

describe("matchContentByUrl", () => {
  it("returns a bounded content summary for matched pages", () => {
    const index = buildContentUrlIndex([
      entry("id-1", "post:1", "https://example.com/hello", "Hello")
    ]);

    expect(matchContentByUrl("https://www.example.com/hello/?ref=gsc", index)).toEqual({
      contentItemId: "id-1",
      externalId: "post:1",
      title: "Hello"
    });
    expect(matchContentByUrl("https://example.com/other", index)).toBeNull();
  });
});

describe("matchTrafficLossPages", () => {
  it("enriches drops with matched synced content and leaves misses null", () => {
    const matched = matchTrafficLossPages(
      [drop("https://www.example.com/hello/"), drop("https://example.com/unknown")],
      [entry("id-1", "post:1", "https://example.com/hello", "Hello")]
    );

    expect(matched[0]?.content).toMatchObject({ contentItemId: "id-1", title: "Hello" });
    expect(matched[0]?.clicksDelta).toBe(-90);
    expect(matched[1]?.content).toBeNull();
  });
});
