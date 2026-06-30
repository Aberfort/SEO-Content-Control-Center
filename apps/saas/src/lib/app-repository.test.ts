import { beforeEach, describe, expect, it } from "vitest";

import { getAppRepository } from "./app-repository";
import { resetDevStore } from "./dev-store";
import type { AppUser } from "./types";

const user: AppUser = {
  id: "00000000-0000-4000-8000-000000000101",
  email: "repository@example.com",
  name: "Repository User"
};

describe("app repository", () => {
  beforeEach(() => {
    delete process.env.SCCC_DATA_STORE;
    delete process.env.DATABASE_URL;
    resetDevStore();
  });

  it("uses the in-memory repository when Prisma is not configured", async () => {
    const repository = getAppRepository();
    const organization = await repository.createOrganization({
      user,
      name: "Repository SEO"
    });

    await repository.createSite({
      user,
      organizationId: organization.id,
      name: "Repository Blog",
      url: "https://repository.example.com"
    });

    const organizations = await repository.listOrganizationSummariesForUser(user);

    expect(organizations).toHaveLength(1);
    expect(organizations[0]?.sites).toHaveLength(1);
    expect(organizations[0]?.activityLogs.map((log) => log.action).sort()).toEqual([
      "organization.created",
      "site.created"
    ]);
  });

  it("invites members and updates non-owner roles through the repository contract", async () => {
    const repository = getAppRepository();
    const organization = await repository.createOrganization({
      user,
      name: "Member Ops"
    });

    const invited = await repository.inviteMember({
      user,
      organizationId: organization.id,
      email: "editor@example.com",
      role: "EDITOR"
    });

    expect(invited.status).toBe("INVITED");
    expect(invited.role).toBe("EDITOR");

    const updated = await repository.updateMemberRole({
      user,
      organizationId: organization.id,
      memberId: invited.id,
      role: "SEO_MANAGER"
    });

    expect(updated.role).toBe("SEO_MANAGER");

    const members = await repository.listMembersForOrganization(user.id, organization.id);
    expect(members.map((member) => member.email).sort()).toEqual([
      "editor@example.com",
      "repository@example.com"
    ]);
  });
});
