import { describe, expect, it } from "vitest";

import { assertPermission, hasPermission } from "../src/rbac";
import { organizationCreateSchema, siteCreateSchema } from "../src/schemas";

describe("RBAC", () => {
  it("allows owners to manage billing", () => {
    expect(hasPermission("OWNER", "billing:manage")).toBe(true);
  });

  it("blocks viewers from mutating backlog tasks", () => {
    expect(hasPermission("VIEWER", "backlog:update")).toBe(false);
  });

  it("blocks editors from managing billing", () => {
    expect(hasPermission("EDITOR", "billing:manage")).toBe(false);
  });

  it("throws on denied permissions", () => {
    expect(() => assertPermission("VIEWER", "site:update")).toThrow(
      "Role VIEWER cannot perform site:update"
    );
  });
});

describe("shared schemas", () => {
  it("validates organization creation input", () => {
    expect(organizationCreateSchema.parse({ name: "Acme SEO" })).toEqual({ name: "Acme SEO" });
    expect(() => organizationCreateSchema.parse({ name: "A" })).toThrow();
  });

  it("validates site creation input", () => {
    expect(() =>
      siteCreateSchema.parse({
        organizationId: "11111111-1111-4111-8111-111111111111",
        name: "Main Blog",
        url: "https://example.com"
      })
    ).not.toThrow();
  });
});
