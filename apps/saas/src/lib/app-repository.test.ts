import { beforeEach, describe, expect, it } from "vitest";

import { getAppRepository } from "./app-repository";
import { getDevStore, resetDevStore } from "./dev-store";
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
    expect(
      await repository.listAssistantRecommendationsForSite(
        user.id,
        organization.id,
        organizations[0]?.sites[0]?.id ?? ""
      )
    ).toMatchObject({
      recommendations: [],
      usage: {
        metric: "ai_credits",
        periodStart: expect.any(String),
        periodEnd: expect.any(String),
        used: 0,
        limit: 0,
        remaining: 0,
        limited: false,
        metered: false
      }
    });
    const billingOverview = await repository.getBillingOverviewForOrganization(
      user.id,
      organization.id
    );

    expect(billingOverview.currentPlan).toMatchObject({
      code: "TRIAL",
      name: "Trial",
      monthlyPrice: 0,
      limits: {
        sites: 1,
        urlsPerSite: 500,
        users: 2,
        aiCredits: 0,
        apiAccess: false
      }
    });
    expect(billingOverview.plans.map((plan) => plan.code)).toEqual([
      "TRIAL",
      "STARTER",
      "PRO",
      "AGENCY",
      "ENTERPRISE"
    ]);
    expect(billingOverview.subscription).toBeNull();
    expect(billingOverview.isFallbackTrial).toBe(true);
    expect(billingOverview.featureGates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "sites",
          used: 1,
          limit: 1,
          remaining: 0,
          allowed: false
        }),
        expect.objectContaining({
          key: "users",
          used: 1,
          limit: 2,
          remaining: 1,
          allowed: true
        })
      ])
    );
    expect(billingOverview.actions.portal).toMatchObject({
      type: "billing_portal",
      enabled: false,
      disabledReason: "No paid subscription is connected.",
      requiresBillingManage: true,
      noMutation: true
    });
    expect(
      billingOverview.actions.checkout.find((action) => action.targetPlanCode === "PRO")
    ).toMatchObject({
      type: "checkout",
      label: "Select plan",
      enabled: false,
      disabledReason: "Billing provider is not configured.",
      requiresBillingManage: true,
      noMutation: true
    });
    await expect(
      repository.createSite({
        user,
        organizationId: organization.id,
        name: "Repository Docs",
        url: "https://docs.repository.example.com"
      })
    ).rejects.toThrow("PLAN_SITE_LIMIT_REACHED");
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
      repository.listBacklogTaskActivity(
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
    expect(
      await repository.listBulkOperationsForSite(
        user.id,
        organization.id,
        organizations[0]?.sites[0]?.id ?? ""
      )
    ).toEqual([]);
    expect(await repository.listNotificationsForOrganization(user.id, organization.id)).toEqual([]);
    await expect(
      repository.updateNotificationReadState({
        user,
        organizationId: organization.id,
        notificationId: "00000000-0000-4000-8000-000000000909",
        read: true
      })
    ).rejects.toThrow("NOTIFICATION_NOT_FOUND");
    await expect(
      repository.createBulkOperationPreview({
        user,
        organizationId: organization.id,
        siteId: organizations[0]?.sites[0]?.id ?? "",
        taskId: "00000000-0000-4000-8000-000000000404"
      })
    ).rejects.toThrow("BACKLOG_TASK_NOT_FOUND");
    await expect(
      repository.runBulkOperationDryRun({
        user,
        organizationId: organization.id,
        siteId: organizations[0]?.sites[0]?.id ?? "",
        operationId: "00000000-0000-4000-8000-000000000909"
      })
    ).rejects.toThrow("BULK_OPERATION_NOT_FOUND");
    await expect(
      repository.confirmBulkOperation({
        user,
        organizationId: organization.id,
        siteId: organizations[0]?.sites[0]?.id ?? "",
        operationId: "00000000-0000-4000-8000-000000000909",
        confirmation: "CONFIRM"
      })
    ).rejects.toThrow("BULK_OPERATION_NOT_FOUND");
    await expect(
      repository.startBulkOperation({
        user,
        organizationId: organization.id,
        siteId: organizations[0]?.sites[0]?.id ?? "",
        operationId: "00000000-0000-4000-8000-000000000909"
      })
    ).rejects.toThrow("BULK_OPERATION_NOT_FOUND");
    await expect(
      repository.finishBulkOperation({
        user,
        organizationId: organization.id,
        siteId: organizations[0]?.sites[0]?.id ?? "",
        operationId: "00000000-0000-4000-8000-000000000909",
        status: "COMPLETED"
      })
    ).rejects.toThrow("BULK_OPERATION_NOT_FOUND");
    await expect(
      repository.rollbackBulkOperation({
        user,
        organizationId: organization.id,
        siteId: organizations[0]?.sites[0]?.id ?? "",
        operationId: "00000000-0000-4000-8000-000000000909"
      })
    ).rejects.toThrow("BULK_OPERATION_NOT_FOUND");
    await expect(
      repository.retryBulkOperation({
        user,
        organizationId: organization.id,
        siteId: organizations[0]?.sites[0]?.id ?? "",
        operationId: "00000000-0000-4000-8000-000000000909"
      })
    ).rejects.toThrow("BULK_OPERATION_NOT_FOUND");
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
    await expect(
      repository.inviteMember({
        user,
        organizationId: organization.id,
        email: "writer@example.com",
        role: "WRITER"
      })
    ).rejects.toThrow("PLAN_USER_LIMIT_REACHED");
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

    const secondOrganization = await repository.createOrganization({
      user,
      name: "Invite Cancellation"
    });
    const secondInvite = await repository.inviteMember({
      user,
      organizationId: secondOrganization.id,
      email: "viewer@example.com",
      role: "VIEWER"
    });
    const resentInvite = await repository.resendInvite({
      user,
      organizationId: secondOrganization.id,
      memberId: secondInvite.member.id
    });

    expect(resentInvite.inviteUrl).not.toBe(secondInvite.inviteUrl);

    const canceled = await repository.cancelInvite({
      user,
      organizationId: secondOrganization.id,
      memberId: secondInvite.member.id
    });

    expect(canceled.status).toBe("CANCELED");
  });

  it("finishes a running bulk operation with per-item results", async () => {
    const repository = getAppRepository();
    const organization = await repository.createOrganization({
      user,
      name: "Bulk Result Ops"
    });
    const site = await repository.createSite({
      user,
      organizationId: organization.id,
      name: "Bulk Result Site",
      url: "https://bulk-result.example.com"
    });
    const now = new Date().toISOString();
    const task = {
      id: "00000000-0000-4000-8000-000000000404",
      organizationId: organization.id,
      siteId: site.id,
      auditIssueId: null,
      title: "Update SEO title",
      url: "https://bulk-result.example.com/page",
      issueType: "missing_meta_title",
      status: "TODO" as const,
      severity: "HIGH" as const,
      potentialImpact: "Search snippets can underperform.",
      effortEstimate: 2,
      assigneeId: null,
      dueDate: null,
      tags: ["test"],
      createdAt: now,
      updatedAt: now,
      comments: [],
      activityLogs: []
    };
    getDevStore().backlogTasks.push(task);

    const recommendationList = await repository.listAssistantRecommendationsForSite(
      user.id,
      organization.id,
      site.id,
      { limit: 3 }
    );
    const recommendations = recommendationList.recommendations;

    expect(recommendationList.usage).toMatchObject({
      metric: "ai_credits",
      used: 0,
      limit: 0,
      remaining: 0,
      limited: false,
      metered: false
    });

    expect(recommendations[0]).toMatchObject({
      id: `backlog:${task.id}`,
      organizationId: organization.id,
      siteId: site.id,
      title: "Update SEO title",
      priority: "high",
      noMutation: true,
      source: {
        type: "backlog_task",
        id: task.id,
        url: task.url
      },
      action: {
        type: "safe_preview",
        enabled: true,
        requiresManualConfirmation: true,
        targetTaskId: task.id,
        disabledReason: null
      }
    });
    expect(recommendations[0]?.safeguards).toContain("manual_confirmation_required");

    const preview = await repository.createBulkOperationPreview({
      user,
      organizationId: organization.id,
      siteId: site.id,
      taskId: task.id
    });
    const dryRun = await repository.runBulkOperationDryRun({
      user,
      organizationId: organization.id,
      siteId: site.id,
      operationId: preview.id
    });
    const confirmed = await repository.confirmBulkOperation({
      user,
      organizationId: organization.id,
      siteId: site.id,
      operationId: dryRun.id,
      confirmation: "CONFIRM"
    });
    const running = await repository.startBulkOperation({
      user,
      organizationId: organization.id,
      siteId: site.id,
      operationId: confirmed.id
    });

    expect(running.status).toBe("RUNNING");

    const finished = await repository.finishBulkOperation({
      user,
      organizationId: organization.id,
      siteId: site.id,
      operationId: running.id,
      status: "FAILED",
      message: "Worker reported a validation failure.",
      itemResults: [
        {
          itemId: running.items[0]?.id ?? "",
          status: "FAILED",
          error: "Meta title target is no longer valid."
        }
      ]
    });

    expect(finished.status).toBe("FAILED");
    expect(finished.items[0]).toMatchObject({
      status: "FAILED",
      error: "Meta title target is no longer valid."
    });
    expect(
      (await repository.listActivityLogsForOrganization(user.id, organization.id)).map(
        (log) => log.action
      )
    ).toContain("bulk_operation.failed");
    expect(
      (await repository.listNotificationsForOrganization(user.id, organization.id)).map(
        (notification) => notification.type
      )
    ).toEqual(["bulk_operation.failed"]);

    const retried = await repository.retryBulkOperation({
      user,
      organizationId: organization.id,
      siteId: site.id,
      operationId: finished.id,
      reason: "Retry failed metadata write."
    });

    expect(retried.status).toBe("RUNNING");
    expect(retried.items[0]).toMatchObject({
      status: "RUNNING",
      error: null
    });
    expect(
      (await repository.listActivityLogsForOrganization(user.id, organization.id)).map(
        (log) => log.action
      )
    ).toContain("bulk_operation.retry_started");
    expect(
      (await repository.listNotificationsForOrganization(user.id, organization.id)).map(
        (notification) => notification.type
      )
    ).toEqual(expect.arrayContaining(["bulk_operation.failed", "bulk_operation.retry_started"]));
    const failedNotification = (
      await repository.listNotificationsForOrganization(user.id, organization.id)
    ).find((notification) => notification.type === "bulk_operation.failed");

    expect(failedNotification?.readAt).toBeNull();

    const readNotification = await repository.updateNotificationReadState({
      user,
      organizationId: organization.id,
      notificationId: failedNotification?.id ?? "",
      read: true
    });

    expect(readNotification.readAt).toEqual(expect.any(String));
    expect(
      (
        await repository.listNotificationsForOrganization(user.id, organization.id, {
          read: "unread"
        })
      ).map((notification) => notification.type)
    ).not.toContain("bulk_operation.failed");
    expect(
      (
        await repository.listNotificationsForOrganization(user.id, organization.id, {
          read: "read"
        })
      ).map((notification) => notification.type)
    ).toContain("bulk_operation.failed");

    const unreadNotification = await repository.updateNotificationReadState({
      user,
      organizationId: organization.id,
      notificationId: failedNotification?.id ?? "",
      read: false
    });

    expect(unreadNotification.readAt).toBeNull();

    const markedAllRead = await repository.markAllNotificationsRead(user, organization.id);

    expect(markedAllRead.updatedCount).toBe(2);
    expect(
      await repository.listNotificationsForOrganization(user.id, organization.id, {
        read: "unread"
      })
    ).toEqual([]);
    expect(
      (
        await repository.listNotificationsForOrganization(user.id, organization.id, {
          read: "read"
        })
      ).map((notification) => notification.type)
    ).toEqual(expect.arrayContaining(["bulk_operation.failed", "bulk_operation.retry_started"]));
    await expect(repository.markAllNotificationsRead(user, organization.id)).resolves.toEqual({
      updatedCount: 0
    });
  });

  it("rolls back a finished bulk operation without inline writes", async () => {
    const repository = getAppRepository();
    const organization = await repository.createOrganization({
      user,
      name: "Bulk Rollback Ops"
    });
    const site = await repository.createSite({
      user,
      organizationId: organization.id,
      name: "Bulk Rollback Site",
      url: "https://bulk-rollback.example.com"
    });
    const now = new Date().toISOString();
    const task = {
      id: "00000000-0000-4000-8000-000000000405",
      organizationId: organization.id,
      siteId: site.id,
      auditIssueId: null,
      title: "Restore SEO title",
      url: "https://bulk-rollback.example.com/page",
      issueType: "missing_meta_title",
      status: "TODO" as const,
      severity: "HIGH" as const,
      potentialImpact: "Search snippets can underperform.",
      effortEstimate: 2,
      assigneeId: null,
      dueDate: null,
      tags: ["test"],
      createdAt: now,
      updatedAt: now,
      comments: [],
      activityLogs: []
    };
    getDevStore().backlogTasks.push(task);

    const preview = await repository.createBulkOperationPreview({
      user,
      organizationId: organization.id,
      siteId: site.id,
      taskId: task.id
    });
    await repository.runBulkOperationDryRun({
      user,
      organizationId: organization.id,
      siteId: site.id,
      operationId: preview.id
    });
    await repository.confirmBulkOperation({
      user,
      organizationId: organization.id,
      siteId: site.id,
      operationId: preview.id,
      confirmation: "CONFIRM"
    });
    await repository.startBulkOperation({
      user,
      organizationId: organization.id,
      siteId: site.id,
      operationId: preview.id
    });
    await repository.finishBulkOperation({
      user,
      organizationId: organization.id,
      siteId: site.id,
      operationId: preview.id,
      status: "COMPLETED",
      message: "Worker completed safely."
    });
    expect(
      (await repository.listNotificationsForOrganization(user.id, organization.id)).map(
        (notification) => notification.type
      )
    ).toEqual(["bulk_operation.completed"]);

    const rolledBack = await repository.rollbackBulkOperation({
      user,
      organizationId: organization.id,
      siteId: site.id,
      operationId: preview.id,
      reason: "Restore previous metadata values."
    });

    expect(rolledBack.status).toBe("ROLLED_BACK");
    expect(rolledBack.items.every((item) => item.status === "ROLLED_BACK")).toBe(true);
    expect(rolledBack.items.every((item) => item.error === null)).toBe(true);
    expect(
      (await repository.listActivityLogsForOrganization(user.id, organization.id)).map(
        (log) => log.action
      )
    ).toContain("bulk_operation.rolled_back");
    expect(
      (await repository.listNotificationsForOrganization(user.id, organization.id)).map(
        (notification) => notification.type
      )
    ).toEqual(expect.arrayContaining(["bulk_operation.completed", "bulk_operation.rolled_back"]));
  });
});
