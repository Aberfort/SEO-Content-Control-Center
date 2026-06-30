import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const keyLength = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, keyLength).toString("hex");

  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash: string | null): boolean {
  if (!storedHash) {
    return false;
  }

  const [scheme, salt, hash] = storedHash.split("$");

  if (scheme !== "scrypt" || !salt || !hash) {
    return false;
  }

  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, keyLength);

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
