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
    expect(
      await repository.listSyncedContentForSite(
        user.id,
        organization.id,
        organizations[0]?.sites[0]?.id ?? ""
      )
    ).toEqual({
      items: [],
      nextCursor: null,
      total: 0
    });
    expect(
      await repository.getSyncedContentItem(
        user.id,
        organization.id,
        organizations[0]?.sites[0]?.id ?? "",
        "00000000-0000-4000-8000-000000000303"
      )
    ).toBeNull();
    const audit = await repository.createAuditForSite({
      user,
      organizationId: organization.id,
      siteId: organizations[0]?.sites[0]?.id ?? ""
    });

    expect(audit).toMatchObject({
      organizationId: organization.id,
      siteId: organizations[0]?.sites[0]?.id,
      status: "QUEUED",
      startedAt: null,
      completedAt: null
    });
    expect(
      await repository.listAuditsForSite(
        user.id,
        organization.id,
        organizations[0]?.sites[0]?.id ?? "",
        { status: "QUEUED" }
      )
    ).toEqual([audit]);
    await expect(
      repository.listAuditIssuesForAudit(
        user.id,
        organization.id,
        organizations[0]?.sites[0]?.id ?? "",
        "00000000-0000-4000-8000-000000000606",
        {
          query: "meta",
          status: "OPEN",
          severity: "HIGH"
        }
      )
    ).rejects.toThrow("AUDIT_NOT_FOUND");
    await expect(
      repository.updateAuditIssueStatus({
        user,
        organizationId: organization.id,
        siteId: organizations[0]?.sites[0]?.id ?? "",
        auditId: "00000000-0000-4000-8000-000000000606",
        issueId: "00000000-0000-4000-8000-000000000707",
        status: "RESOLVED"
      })
    ).rejects.toThrow("AUDIT_ISSUE_NOT_FOUND");
    await expect(
      repository.createBacklogTaskFromCandidate({
        user,
        organizationId: organization.id,
        siteId: organizations[0]?.sites[0]?.id ?? "",
        contentItemId: "00000000-0000-4000-8000-000000000303",
        candidateId: "00000000-0000-4000-8000-000000000303:title"
      })
    ).rejects.toThrow("CONTENT_ITEM_NOT_FOUND");
    await expect(
      repository.createBacklogTaskFromAuditIssue({
        user,
        organizationId: organization.id,
        siteId: organizations[0]?.sites[0]?.id ?? "",
        auditIssueId: "00000000-0000-4000-8000-000000000505"
      })
    ).rejects.toThrow("AUDIT_ISSUE_NOT_FOUND");
    expect(
      await repository.listBacklogTasksForSite(
        user.id,
        organization.id,
        organizations[0]?.sites[0]?.id ?? ""
      )
    ).toEqual({
      items: [],
      summary: {
        total: 0,
        open: 0,
        done: 0,
        byStatus: {
          TODO: 0,
          IN_PROGRESS: 0,
          IN_REVIEW: 0,
          DONE: 0,
          SNOOZED: 0,
          IGNORED: 0
        },
        bySeverity: {
          LOW: 0,
          MEDIUM: 0,
          HIGH: 0,
          CRITICAL: 0
        }
      }
    });
    await expect(
      repository.updateBacklogTaskStatus({
        user,
        organizationId: organization.id,
        siteId: organizations[0]?.sites[0]?.id ?? "",
        taskId: "00000000-0000-4000-8000-000000000404",
        status: "DONE"
      })
    ).rejects.toThrow("BACKLOG_TASK_NOT_FOUND");
    await expect(
      repository.updateBacklogTaskAssignment({
        user,
        organizationId: organization.id,
        siteId: organizations[0]?.sites[0]?.id ?? "",
        taskId: "00000000-0000-4000-8000-000000000404",
        assigneeId: user.id,
        dueDate: "2026-07-10"
      })
    ).rejects.toThrow("BACKLOG_TASK_NOT_FOUND");
    await expect(
      repository.listBacklogTaskComments(
        user.id,
        organization.id,
        organizations[0]?.sites[0]?.id ?? "",
        "00000000-0000-4000-8000-000000000404"
      )
    ).rejects.toThrow("BACKLOG_TASK_NOT_FOUND");
    await expect(
      repository.createBacklogTaskComment({
        user,
        organizationId: organization.id,
        siteId: organizations[0]?.sites[0]?.id ?? "",
        taskId: "00000000-0000-4000-8000-000000000404",
        body: "Check metadata before publishing."
      })
    ).rejects.toThrow("BACKLOG_TASK_NOT_FOUND");
    const refreshedOrganization = await repository.getOrganizationSummary(user.id, organization.id);
    expect(refreshedOrganization?.activityLogs.map((log) => log.action).sort()).toEqual([
      "audit.queued",
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

    const invite = await repository.inviteMember({
      user,
      organizationId: organization.id,
      email: "editor@example.com",
      role: "EDITOR"
    });
    const invited = invite.member;

    expect(invited.status).toBe("INVITED");
    expect(invited.role).toBe("EDITOR");
    expect(invite.inviteUrl).toContain("/auth/accept-invite?token=");

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

  it("accepts, resends, and cancels pending invites through the repository contract", async () => {
    const repository = getAppRepository();
    const organization = await repository.createOrganization({
      user,
      name: "Invite Lifecycle"
    });

    const invite = await repository.inviteMember({
      user,
      organizationId: organization.id,
      email: "writer@example.com",
      role: "WRITER"
    });
    const token = new URL(invite.inviteUrl).searchParams.get("token");

    expect(token).toBeTruthy();

    const accepted = await repository.acceptInvite({
      user: {
        id: "00000000-0000-4000-8000-000000000202",
        email: "writer@example.com",
        name: "Writer User"
      },
      token: token ?? ""
    });

    expect(accepted.status).toBe("ACTIVE");

    const secondInvite = await repository.inviteMember({
      user,
      organizationId: organization.id,
      email: "viewer@example.com",
      role: "VIEWER"
    });
    const resentInvite = await repository.resendInvite({
      user,
      organizationId: organization.id,
      memberId: secondInvite.member.id
    });

    expect(resentInvite.inviteUrl).not.toBe(secondInvite.inviteUrl);

    const canceled = await repository.cancelInvite({
      user,
      organizationId: organization.id,
      memberId: secondInvite.member.id
    });

    expect(canceled.status).toBe("CANCELED");
  });
});
