import { describe, expect, it } from "vitest";

import { parseDemoLead } from "./demo-lead";

const validLead = {
  name: "Jordan Lee",
  workEmail: "JORDAN@example.com",
  company: "Acme Publishing",
  website: "https://example.com",
  role: "SEO lead",
  siteCount: "6-20",
  topic: "Product demo",
  notes: "We want to replace our audit spreadsheet.",
  consent: "on"
};

describe("demo lead validation", () => {
  it("normalizes a complete lead", () => {
    expect(parseDemoLead(validLead)).toEqual({
      success: true,
      data: {
        name: "Jordan Lee",
        workEmail: "jordan@example.com",
        company: "Acme Publishing",
        website: "https://example.com",
        role: "SEO lead",
        siteCount: "6-20",
        topic: "Product demo",
        notes: "We want to replace our audit spreadsheet."
      }
    });
  });

  it("rejects missing required fields and consent", () => {
    const result = parseDemoLead({});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toMatchObject({
        name: expect.any(String),
        workEmail: expect.any(String),
        company: expect.any(String),
        role: expect.any(String),
        siteCount: expect.any(String),
        topic: expect.any(String),
        consent: expect.any(String)
      });
    }
  });

  it("rejects unsafe website protocols and oversized notes", () => {
    const result = parseDemoLead({
      ...validLead,
      website: "javascript:alert(1)",
      notes: "x".repeat(1201)
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.website).toBeDefined();
      expect(result.errors.notes).toBeDefined();
    }
  });
});
