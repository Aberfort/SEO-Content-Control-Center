import { describe, expect, it } from "vitest";

import { assertPermission, hasPermission } from "../src/rbac";

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
