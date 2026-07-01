import { describe, expect, it } from "vitest";

import { assertPermission, hasPermission } from "../src/rbac";
import {
  acceptInviteSchema,
  inviteMemberSchema,
  loginSchema,
  organizationCreateSchema,
  pluginConnectionChallengeCreateSchema,
  pluginConnectionExchangeSchema,
  registerSchema,
  siteCreateSchema,
  updateMemberRoleSchema
} from "../src/schemas";

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

  it("validates auth inputs", () => {
    expect(
      registerSchema.parse({
        name: "Serhii",
        email: "USER@EXAMPLE.COM",
        password: "very-secure-password"
      }).email
    ).toBe("user@example.com");

    expect(() =>
      registerSchema.parse({
        name: "S",
        email: "not-email",
        password: "short"
      })
    ).toThrow();

    expect(
      loginSchema.parse({
        email: "USER@EXAMPLE.COM",
        password: "x"
      }).email
    ).toBe("user@example.com");
  });

  it("validates member invite and role update inputs", () => {
    expect(
      inviteMemberSchema.parse({
        organizationId: "11111111-1111-4111-8111-111111111111",
        email: "EDITOR@EXAMPLE.COM",
        role: "EDITOR"
      }).email
    ).toBe("editor@example.com");

    expect(() =>
      inviteMemberSchema.parse({
        organizationId: "11111111-1111-4111-8111-111111111111",
        email: "owner@example.com",
        role: "OWNER"
      })
    ).toThrow();

    expect(() =>
      updateMemberRoleSchema.parse({
        organizationId: "11111111-1111-4111-8111-111111111111",
        memberId: "22222222-2222-4222-8222-222222222222",
        role: "SEO_MANAGER"
      })
    ).not.toThrow();
  });

  it("validates invite acceptance input", () => {
    expect(() => acceptInviteSchema.parse({ token: "a".repeat(43) })).not.toThrow();
    expect(() => acceptInviteSchema.parse({ token: "short" })).toThrow();
  });

  it("validates plugin connection inputs", () => {
    expect(() =>
      pluginConnectionChallengeCreateSchema.parse({
        organizationId: "11111111-1111-4111-8111-111111111111",
        siteId: "22222222-2222-4222-8222-222222222222"
      })
    ).not.toThrow();

    expect(() =>
      pluginConnectionExchangeSchema.parse({
        challenge: "a".repeat(43),
        endpoint: "https://app.example.com"
      })
    ).not.toThrow();

    expect(() =>
      pluginConnectionExchangeSchema.parse({
        challenge: "short",
        endpoint: "not-url"
      })
    ).toThrow();
  });
});
