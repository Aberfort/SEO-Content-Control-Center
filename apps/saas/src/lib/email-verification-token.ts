import { createHash, randomBytes } from "node:crypto";

const emailVerificationTtlMs = 1000 * 60 * 60 * 24;

export type EmailVerificationToken = {
  token: string;
  tokenHash: string;
  expiresAt: Date;
};

export function createEmailVerificationToken(now = new Date()): EmailVerificationToken {
  const token = randomBytes(32).toString("base64url");

  return {
    token,
    tokenHash: hashEmailVerificationToken(token),
    expiresAt: new Date(now.getTime() + emailVerificationTtlMs)
  };
}

export function hashEmailVerificationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function buildEmailVerificationUrl(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = new URL("/auth/verify-email", baseUrl);
  url.searchParams.set("token", token);
  return url.toString();
}
