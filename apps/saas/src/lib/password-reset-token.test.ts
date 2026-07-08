import { describe, expect, it } from "vitest";

import { buildPasswordResetUrl, hashPasswordResetToken } from "./password-reset-token";

describe("password reset tokens", () => {
  it("hashes raw tokens before storage", () => {
    expect(hashPasswordResetToken("reset-secret")).toBe(
      "133529a090dc8b103372576b966d55d44d151a60f6daa0264dc4f37ce4791bc0"
    );
  });

  it("builds reset URLs on the configured app origin", () => {
    const previous = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";

    try {
      expect(buildPasswordResetUrl("token")).toBe(
        "https://app.example.com/auth/reset-password?token=token"
      );
    } finally {
      if (previous === undefined) {
        delete process.env.NEXT_PUBLIC_APP_URL;
      } else {
        process.env.NEXT_PUBLIC_APP_URL = previous;
      }
    }
  });
});
