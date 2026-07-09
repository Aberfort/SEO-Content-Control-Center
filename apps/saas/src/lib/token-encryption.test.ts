import { describe, expect, it } from "vitest";

import { decryptSecret, encryptSecret, isTokenEncryptionConfigured } from "./token-encryption";

describe("token encryption", () => {
  it("encrypts and decrypts recoverable secrets", () => {
    const env = {
      SCCC_TOKEN_ENCRYPTION_KEY: "local-test-token-encryption-key"
    };
    const encrypted = encryptSecret("refresh-token", env);

    expect(encrypted).not.toBe("refresh-token");
    expect(decryptSecret(encrypted, env)).toBe("refresh-token");
  });

  it("requires a configured encryption key", () => {
    expect(isTokenEncryptionConfigured({})).toBe(false);
    expect(() => encryptSecret("refresh-token", {})).toThrow("TOKEN_ENCRYPTION_KEY_NOT_CONFIGURED");
  });
});
