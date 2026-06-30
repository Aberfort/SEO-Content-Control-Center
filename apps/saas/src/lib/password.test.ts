import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("hashes and verifies passwords without storing plaintext", () => {
    const password = "very-secure-password";
    const hash = hashPassword(password);

    expect(hash).not.toContain(password);
    expect(verifyPassword(password, hash)).toBe(true);
    expect(verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("rejects missing or malformed hashes", () => {
    expect(verifyPassword("password", null)).toBe(false);
    expect(verifyPassword("password", "not-a-real-hash")).toBe(false);
  });
});
