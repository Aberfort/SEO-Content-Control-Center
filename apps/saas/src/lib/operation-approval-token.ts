import { createHash, randomBytes } from "node:crypto";

const approvalTtlMs = 1000 * 60 * 60 * 24 * 7;

export type OperationApprovalToken = {
  token: string;
  tokenHash: string;
  expiresAt: Date;
};

export function createOperationApprovalToken(now = new Date()): OperationApprovalToken {
  const token = randomBytes(32).toString("base64url");

  return {
    token,
    tokenHash: hashOperationApprovalToken(token),
    expiresAt: new Date(now.getTime() + approvalTtlMs)
  };
}

export function hashOperationApprovalToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function buildOperationApprovalUrl(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = new URL(`/approve/${encodeURIComponent(token)}`, baseUrl);
  return url.toString();
}
