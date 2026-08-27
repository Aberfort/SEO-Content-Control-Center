import { describe, expect, it } from "vitest";

import { normalizeUrl } from "../src/url-matching";

describe("normalizeUrl", () => {
  it("ignores protocol differences", () => {
    expect(normalizeUrl("https://example.com/page")).toEqual(normalizeUrl("http://example.com/page"));
  });

  it("ignores a leading www. host prefix", () => {
    expect(normalizeUrl("https://www.example.com/page")).toEqual(
      normalizeUrl("https://example.com/page")
    );
  });

  it("ignores trailing slashes", () => {
    expect(normalizeUrl("https://example.com/page/")).toEqual(
      normalizeUrl("https://example.com/page")
    );
  });

  it("ignores query strings and fragments", () => {
    expect(normalizeUrl("https://example.com/page?utm_source=google#section")).toEqual(
      normalizeUrl("https://example.com/page")
    );
  });

  it("treats different hosts or paths as distinct", () => {
    expect(normalizeUrl("https://example.com/page-a")).not.toEqual(
      normalizeUrl("https://example.com/page-b")
    );
    expect(normalizeUrl("https://example.com/page")).not.toEqual(
      normalizeUrl("https://other.example.com/page")
    );
  });

  it("returns null for an invalid or non-http(s) URL", () => {
    expect(normalizeUrl("not a url")).toBeNull();
    expect(normalizeUrl("ftp://example.com/page")).toBeNull();
    expect(normalizeUrl("")).toBeNull();
  });

  it("normalizes the root path consistently", () => {
    expect(normalizeUrl("https://example.com")).toEqual(normalizeUrl("https://example.com/"));
  });
});
