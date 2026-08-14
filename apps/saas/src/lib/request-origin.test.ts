import { describe, expect, it } from "vitest";

import { requestOriginFromHeaders, resolvePluginConnectionEndpoint } from "./request-origin";

describe("request origin helpers", () => {
  it("uses the same-origin browser origin when it is available", () => {
    const headers = new Headers({
      origin: "https://app.example.com/settings",
      host: "internal.example.test"
    });

    expect(resolvePluginConnectionEndpoint(headers, "https://configured.example.com")).toBe(
      "https://app.example.com"
    );
  });

  it("falls back to forwarded host metadata", () => {
    const headers = new Headers({
      "x-forwarded-host": "preview.example.com",
      "x-forwarded-proto": "https"
    });

    expect(requestOriginFromHeaders(headers)).toBe("https://preview.example.com");
  });

  it("falls back to the configured app URL for non-HTTP request metadata", () => {
    const headers = new Headers({
      origin: "chrome-extension://abc"
    });

    expect(resolvePluginConnectionEndpoint(headers, "https://saas.example.com/app")).toBe(
      "https://saas.example.com"
    );
  });
});
