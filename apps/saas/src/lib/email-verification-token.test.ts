import { describe, expect, it } from "vitest";

import { buildEmailVerificationUrl, hashEmailVerificationToken } from "./email-verification-token";

describe("email verification tokens", () => {
  it("hashes raw tokens before storage", () => {
    expect(hashEmailVerificationToken("verification-secret")).toBe(
      "dce0a15969c42410f7ed9b59c6187e855095f59fd36a3a3351adc993b4c8002f"
    );
  });

  it("builds verification URLs on the configured app origin", () => {
    const previous = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";

    try {
      expect(buildEmailVerificationUrl("token")).toBe(
        "https://app.example.com/auth/verify-email?token=token"
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
