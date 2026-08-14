import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const tokenEncryptionVersion = "v1";
const algorithm = "aes-256-gcm";
type Environment = Record<string, string | undefined>;

export function isTokenEncryptionConfigured(env: Environment = process.env): boolean {
  return Boolean(env.SCCC_TOKEN_ENCRYPTION_KEY?.trim());
}

export function encryptSecret(value: string, env: Environment = process.env): string {
  const key = resolveTokenEncryptionKey(env);
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    tokenEncryptionVersion,
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url")
  ].join(":");
}

export function decryptSecret(value: string, env: Environment = process.env): string {
  const [version, encodedIv, encodedTag, encodedEncrypted] = value.split(":");

  if (version !== tokenEncryptionVersion || !encodedIv || !encodedTag || !encodedEncrypted) {
    throw new Error("TOKEN_ENCRYPTION_PAYLOAD_INVALID");
  }

  const key = resolveTokenEncryptionKey(env);
  const decipher = createDecipheriv(algorithm, key, Buffer.from(encodedIv, "base64url"));
  decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encodedEncrypted, "base64url")),
    decipher.final()
  ]).toString("utf8");
}

function resolveTokenEncryptionKey(env: Environment): Buffer {
  const value = env.SCCC_TOKEN_ENCRYPTION_KEY?.trim();

  if (!value) {
    throw new Error("TOKEN_ENCRYPTION_KEY_NOT_CONFIGURED");
  }

  return createHash("sha256").update(value).digest();
}
