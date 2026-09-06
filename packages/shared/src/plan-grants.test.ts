import { describe, expect, it } from "vitest";

import {
  createPlanGrantCodeSchema,
  generatePlanGrantCode,
  getPlanGrantCodeStatus,
  isGrantablePlanCode,
  normalizePlanGrantCode,
  redeemPlanGrantCodeSchema,
  type PlanGrantCode
} from "./plan-grants";

describe("generatePlanGrantCode", () => {
  it("formats as three 4-character segments from a safe alphabet", () => {
    const bytes = Uint8Array.from({ length: 12 }, (_, i) => i * 17);
    const code = generatePlanGrantCode(() => bytes);

    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/);
  });

  it("throws if fewer random bytes are supplied than characters needed", () => {
    expect(() => generatePlanGrantCode(() => new Uint8Array(4))).toThrow();
  });
});

describe("normalizePlanGrantCode", () => {
  it("uppercases and strips separators/whitespace so lookups are forgiving", () => {
    expect(normalizePlanGrantCode("qx9m-2vbd-7f3k")).toBe("QX9M2VBD7F3K");
    expect(normalizePlanGrantCode(" QX9M 2VBD 7F3K ")).toBe("QX9M2VBD7F3K");
  });
});

describe("isGrantablePlanCode", () => {
  it("accepts only the plans an owner can comp", () => {
    expect(isGrantablePlanCode("STARTER")).toBe(true);
    expect(isGrantablePlanCode("PRO")).toBe(true);
    expect(isGrantablePlanCode("AGENCY")).toBe(true);
    expect(isGrantablePlanCode("TRIAL")).toBe(false);
    expect(isGrantablePlanCode("ENTERPRISE")).toBe(false);
  });
});

describe("createPlanGrantCodeSchema", () => {
  it("accepts a bare plan code with no recipient or note", () => {
    const parsed = createPlanGrantCodeSchema.parse({ planCode: "STARTER" });
    expect(parsed).toEqual({ planCode: "STARTER" });
  });

  it("treats an empty-string email as absent instead of failing validation", () => {
    const parsed = createPlanGrantCodeSchema.parse({ planCode: "PRO", recipientEmail: "" });
    expect(parsed.recipientEmail).toBeUndefined();
  });

  it("rejects a plan outside the grantable set", () => {
    expect(() => createPlanGrantCodeSchema.parse({ planCode: "ENTERPRISE" })).toThrow();
  });
});

describe("redeemPlanGrantCodeSchema", () => {
  it("normalizes the submitted code", () => {
    const parsed = redeemPlanGrantCodeSchema.parse({
      organizationId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      code: "qx9m-2vbd-7f3k"
    });
    expect(parsed.code).toBe("QX9M2VBD7F3K");
  });
});

describe("getPlanGrantCodeStatus", () => {
  const base: PlanGrantCode = {
    id: "grant-1",
    code: "QX9M2VBD7F3K",
    planCode: "STARTER",
    recipientEmail: null,
    note: null,
    createdByUserId: "user-1",
    createdAt: "2026-09-06T00:00:00.000Z",
    revokedAt: null,
    redeemedAt: null,
    redeemedByOrgId: null,
    redeemedByUserId: null
  };

  it("is active when neither redeemed nor revoked", () => {
    expect(getPlanGrantCodeStatus(base)).toBe("active");
  });

  it("is redeemed once a redemption is recorded, even if also revoked", () => {
    expect(
      getPlanGrantCodeStatus({ ...base, redeemedAt: "2026-09-07T00:00:00.000Z" })
    ).toBe("redeemed");
  });

  it("is revoked when canceled before redemption", () => {
    expect(getPlanGrantCodeStatus({ ...base, revokedAt: "2026-09-07T00:00:00.000Z" })).toBe(
      "revoked"
    );
  });
});
