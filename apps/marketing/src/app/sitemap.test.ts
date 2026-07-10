import { describe, expect, it } from "vitest";

import sitemap from "./sitemap";

describe("marketing sitemap", () => {
  it("includes every public product, solution, resource, and service-information route", () => {
    const urls = sitemap().map((entry) => entry.url);

    expect(urls).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/\/product$/),
        expect.stringMatching(/\/integrations$/),
        expect.stringMatching(/\/solutions\/agencies$/),
        expect.stringMatching(/\/solutions\/content-teams$/),
        expect.stringMatching(/\/solutions\/publishers$/),
        expect.stringMatching(/\/knowledge-base$/),
        expect.stringMatching(/\/blog$/),
        expect.stringMatching(/\/changelog$/),
        expect.stringMatching(/\/contact$/),
        expect.stringMatching(/\/status$/)
      ])
    );
    expect(new Set(urls).size).toBe(urls.length);
  });
});
