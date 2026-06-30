import { createHash, randomBytes } from "node:crypto";

const inviteTtlMs = 1000 * 60 * 60 * 24 * 7;

export type InviteToken = {
  token: string;
  tokenHash: string;
  expiresAt: Date;
};

export function createInviteToken(now = new Date()): InviteToken {
  const token = randomBytes(32).toString("base64url");

  return {
    token,
    tokenHash: hashInviteToken(token),
    expiresAt: new Date(now.getTime() + inviteTtlMs)
  };
}

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function buildInviteUrl(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = new URL("/auth/accept-invite", baseUrl);
  url.searchParams.set("token", token);
  return url.toString();
}
