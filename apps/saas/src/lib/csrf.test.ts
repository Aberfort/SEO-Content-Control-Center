import { describe, expect, it } from "vitest";

import { assertSameOrigin, CsrfError, isSameOrigin } from "./csrf";

describe("csrf origin guard", () => {
  it("allows matching origin and host", () => {
    expect(
      isSameOrigin({
        origin: "https://app.example.com",
        host: "app.example.com"
      })
    ).toBe(true);
  });

  it("allows the configured app URL host", () => {
    expect(
      isSameOrigin({
        origin: "https://app.example.com",
        host: "internal.example.com",
        appUrl: "https://app.example.com"
      })
    ).toBe(true);
  });

  it("rejects missing or mismatched origins", () => {
    expect(isSameOrigin({ origin: null, host: "app.example.com" })).toBe(false);
    expect(
      isSameOrigin({
        origin: "https://evil.example.com",
        host: "app.example.com"
      })
    ).toBe(false);
    expect(() =>
      assertSameOrigin({
        origin: "https://evil.example.com",
        host: "app.example.com"
      })
    ).toThrow(CsrfError);
  });
});
