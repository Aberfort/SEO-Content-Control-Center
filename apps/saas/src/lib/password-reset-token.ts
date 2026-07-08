import { createHash, randomBytes } from "node:crypto";

const passwordResetTtlMs = 1000 * 60 * 60;

export type PasswordResetToken = {
  token: string;
  tokenHash: string;
  expiresAt: Date;
};

export function createPasswordResetToken(now = new Date()): PasswordResetToken {
  const token = randomBytes(32).toString("base64url");

  return {
    token,
    tokenHash: hashPasswordResetToken(token),
    expiresAt: new Date(now.getTime() + passwordResetTtlMs)
  };
}

export function hashPasswordResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function buildPasswordResetUrl(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = new URL("/auth/reset-password", baseUrl);
  url.searchParams.set("token", token);
  return url.toString();
}
