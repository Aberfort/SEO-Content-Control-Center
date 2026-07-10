import { describe, expect, it } from "vitest";

import {
  buildTotpProvisioningUri,
  generateTotpCodeForTest,
  generateTotpSecret,
  verifyTotpCode
} from "./totp";

describe("totp", () => {
  it("generates base32 secrets and provisioning URIs", () => {
    const secret = generateTotpSecret();
    const uri = buildTotpProvisioningUri({
      issuer: "SEO Content Control Center",
      accountName: "owner@example.com",
      secret
    });

    expect(secret).toMatch(/^[A-Z2-7]+$/);
    expect(uri).toContain("otpauth://totp/");
    expect(uri).toContain(`secret=${secret}`);
    expect(uri).toContain("issuer=SEO+Content+Control+Center");
  });

  it("verifies the current time window and rejects replayed counters", () => {
    const secret = "JBSWY3DPEHPK3PXP";
    const now = new Date("2026-07-10T12:00:00.000Z");
    const code = generateTotpCodeForTest(secret, now);
    const result = verifyTotpCode({
      secret,
      code,
      now
    });

    expect(result.valid).toBe(true);
    expect(result.counter).toEqual(expect.any(Number));
    expect(
      verifyTotpCode({
        secret,
        code,
        now,
        lastCounter: result.counter
      })
    ).toEqual({
      valid: false,
      counter: null
    });
  });

  it("rejects malformed or wrong codes", () => {
    const secret = "JBSWY3DPEHPK3PXP";
    const now = new Date("2026-07-10T12:00:00.000Z");

    expect(verifyTotpCode({ secret, code: "12345", now })).toEqual({
      valid: false,
      counter: null
    });
    expect(verifyTotpCode({ secret, code: "000000", now })).toEqual({
      valid: false,
      counter: null
    });
  });
});
