import { z } from "zod";

import { authEmailSchema } from "./schemas";
import type { PlanCode } from "./plans";

/** Plans an owner can hand out via a grant code. Not TRIAL (meaningless as a
 * comp) or ENTERPRISE (custom-priced, handled outside this flow). */
export const grantablePlanCodes = ["STARTER", "PRO", "AGENCY"] as const;

export type GrantablePlanCode = (typeof grantablePlanCodes)[number];

export function isGrantablePlanCode(value: string): value is GrantablePlanCode {
  return (grantablePlanCodes as readonly string[]).includes(value);
}

export const planGrantCodeSchema = z.enum(grantablePlanCodes);

const codeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L
const codeSegmentLength = 4;
const codeSegmentCount = 3;

/**
 * Generates a random, human-typeable grant code, e.g. "7F3K-QX9M-2VBD".
 * `randomValues` returns one 0-255 byte per requested character; pass
 * `crypto.getRandomValues`-backed input in production and a seeded stub in
 * tests.
 */
export function generatePlanGrantCode(randomBytes: () => Uint8Array): string {
  const totalChars = codeSegmentLength * codeSegmentCount;
  const bytes = randomBytes();

  if (bytes.length < totalChars) {
    throw new Error(`generatePlanGrantCode needs at least ${totalChars} random bytes`);
  }

  const chars: string[] = [];

  for (let i = 0; i < totalChars; i += 1) {
    chars.push(codeAlphabet[bytes[i]! % codeAlphabet.length]!);
  }

  const segments: string[] = [];

  for (let i = 0; i < codeSegmentCount; i += 1) {
    segments.push(chars.slice(i * codeSegmentLength, (i + 1) * codeSegmentLength).join(""));
  }

  return segments.join("-");
}

/** Uppercases and strips everything but alphanumerics, so "qx9m 2vbd" and
 * "QX9M-2VBD" (and a pasted stray space or lowercase) look up the same row. */
export function normalizePlanGrantCode(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export const createPlanGrantCodeSchema = z.object({
  planCode: planGrantCodeSchema,
  recipientEmail: z
    .union([authEmailSchema, z.literal("")])
    .optional()
    .transform((value) => (value ? value : undefined)),
  note: z
    .string()
    .trim()
    .max(280)
    .optional()
    .transform((value) => (value ? value : undefined))
});

export const redeemPlanGrantCodeSchema = z.object({
  organizationId: z.string().uuid(),
  code: z
    .string()
    .trim()
    .min(1)
    .transform((value) => normalizePlanGrantCode(value))
});

export type PlanGrantCode = {
  id: string;
  code: string;
  planCode: PlanCode;
  recipientEmail: string | null;
  note: string | null;
  createdByUserId: string;
  createdAt: string;
  revokedAt: string | null;
  redeemedAt: string | null;
  redeemedByOrgId: string | null;
  redeemedByUserId: string | null;
};

export type PlanGrantCodeStatus = "active" | "redeemed" | "revoked";

export function getPlanGrantCodeStatus(grant: PlanGrantCode): PlanGrantCodeStatus {
  if (grant.redeemedAt) return "redeemed";
  if (grant.revokedAt) return "revoked";
  return "active";
}
