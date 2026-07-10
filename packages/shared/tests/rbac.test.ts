import { describe, expect, it } from "vitest";

import { assertPermission, hasPermission } from "../src/rbac";
import {
  acceptInviteSchema,
  billingCheckoutCreateSchema,
  inviteMemberSchema,
  loginSchema,
  organizationCreateSchema,
  pluginConnectionChallengeCreateSchema,
  pluginConnectionExchangeSchema,
  pluginSyncItemSchema,
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
        password: "x",
        twoFactorCode: "123456"
      }).email
    ).toBe("user@example.com");

    expect(() =>
      loginSchema.parse({
        email: "user@example.com",
        password: "x",
        twoFactorCode: "12345"
      })
    ).toThrow();
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

  it("validates optional plugin sync metadata", () => {
    expect(
      pluginSyncItemSchema.parse({
        externalId: "post:123",
        type: "post",
        url: "https://example.com/post",
        title: "Example",
        status: "publish",
        modifiedAt: "2026-07-01T08:00:00.000Z"
      }).metadata
    ).toEqual({});

    expect(
      pluginSyncItemSchema.parse({
        externalId: "post:123",
        type: "post",
        url: "https://example.com/post",
        title: "Example",
        status: "publish",
        modifiedAt: "2026-07-01T08:00:00.000Z",
        metadata: {
          authorId: 7,
          authorName: "Editor",
          publishedAt: "2026-06-01T08:00:00.000Z",
          featuredImagePresent: true,
          featuredImageId: 44,
          featuredImageUrl: "https://example.com/image.jpg",
          taxonomies: [{ taxonomy: "category", terms: ["Guides"] }],
          wordCount: 1200,
          internalLinkCount: 3,
          externalLinkCount: 1,
          seoPlugin: "yoast",
          seoTitle: "Example SEO title",
          metaDescription: "Example meta description",
          canonicalUrl: "https://example.com/post",
          robotsNoindex: false,
          robotsNofollow: false
        }
      }).metadata
    ).toMatchObject({
      authorName: "Editor",
      wordCount: 1200,
      internalLinkCount: 3,
      externalLinkCount: 1,
      seoPlugin: "yoast",
      canonicalUrl: "https://example.com/post"
    });

    expect(() =>
      pluginSyncItemSchema.parse({
        externalId: "post:123",
        type: "post",
        url: "https://example.com/post",
        title: "Example",
        status: "publish",
        modifiedAt: "2026-07-01T08:00:00.000Z",
        metadata: {
          token: "not-allowed"
        }
      })
    ).toThrow();
  });

  it("validates billing checkout input", () => {
    expect(billingCheckoutCreateSchema.parse({ planCode: "PRO" })).toEqual({ planCode: "PRO" });
    expect(() => billingCheckoutCreateSchema.parse({ planCode: "UNKNOWN" })).toThrow();
  });
});
