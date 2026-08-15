import type { Prisma } from "@prisma/client";
import {
  buildWorkspaceDeliverableSummary,
  canUseEntitlement,
  planCodes,
  resolveCommercialAccess,
  type SiteDeliverableSummary,
  type WorkspaceDeliverableSummary
} from "@sccc/shared";
import nodemailer from "nodemailer";

import type { DeliverablesScheduleDeps, WorkspaceDigestDeps } from "./handlers";

async function getPrisma() {
  const { prisma } = await import("@sccc/database");
  return prisma;
}

export function isDeliverablesWorkerConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.DATABASE_URL?.trim());
}

export function buildLiveDeliverablesScheduleDeps(
  enqueue: DeliverablesScheduleDeps["enqueue"]
): DeliverablesScheduleDeps {
  return {
    async listOrganizationIds() {
      const prisma = await getPrisma();
      const organizations = await prisma.organization.findMany({
        where: { members: { some: { status: "ACTIVE" } } },
        select: { id: true },
        orderBy: { id: "asc" }
      });
      const allowed: string[] = [];
      for (const organization of organizations) {
        if (await organizationCanReceiveReports(prisma, organization.id)) {
          allowed.push(organization.id);
        }
      }
      return allowed;
    },
    enqueue
  };
}

export function buildLiveWorkspaceDigestDeps(
  env: NodeJS.ProcessEnv = process.env
): WorkspaceDigestDeps {
  return {
    async run(input) {
      const prisma = await getPrisma();
      if (!(await organizationCanReceiveReports(prisma, input.organizationId))) {
        return { runId: "entitlement-blocked", status: "SKIPPED", deduplicated: false };
      }
      const periodStart = new Date(`${input.startDate}T00:00:00.000Z`);
      const periodEnd = new Date(`${input.endDate}T00:00:00.000Z`);
      const existing = await prisma.deliverableRun.findUnique({
        where: {
          organizationId_type_periodStart_periodEnd: {
            organizationId: input.organizationId,
            type: "weekly_digest",
            periodStart,
            periodEnd
          }
        }
      });

      if (existing && ["DELIVERED", "SKIPPED"].includes(existing.status)) {
        return { runId: existing.id, status: existing.status, deduplicated: true };
      }

      const organization = await prisma.organization.findUnique({
        where: { id: input.organizationId },
        include: {
          sites: { orderBy: [{ name: "asc" }, { id: "asc" }] },
          members: {
            where: { status: "ACTIVE" },
            include: {
              user: {
                include: {
                  deliveryPreferences: { where: { organizationId: input.organizationId } }
                }
              }
            }
          }
        }
      });

      if (!organization) throw new Error("ORGANIZATION_NOT_FOUND");

      const generatedAt = new Date();
      const endExclusive = addUtcDays(periodEnd, 1);
      const siteSummaries: SiteDeliverableSummary[] = [];

      for (const site of organization.sites) {
        const [issues, tasks, operations] = await Promise.all([
          prisma.auditIssue.findMany({
            where: { organizationId: organization.id, siteId: site.id },
            select: {
              issueType: true,
              status: true,
              severity: true,
              evidence: true,
              createdAt: true,
              updatedAt: true
            }
          }),
          prisma.backlogTask.findMany({
            where: { organizationId: organization.id, siteId: site.id },
            select: {
              status: true,
              dueDate: true,
              updatedAt: true,
              outcomeStatus: true,
              outcomeVerifiedAt: true
            }
          }),
          prisma.bulkOperation.findMany({
            where: { organizationId: organization.id, siteId: site.id },
            select: { status: true, updatedAt: true }
          })
        ]);

        siteSummaries.push(
          summarizeSite({
            siteId: site.id,
            siteName: site.name,
            siteUrl: site.url,
            start: periodStart,
            endExclusive,
            generatedAt,
            issues,
            tasks,
            operations
          })
        );
      }

      const summary = buildWorkspaceDeliverableSummary({
        organizationId: organization.id,
        organizationName: organization.name,
        startDate: input.startDate,
        endDate: input.endDate,
        generatedAt: generatedAt.toISOString(),
        sites: siteSummaries
      });
      const recipients = organization.members
        .filter((member) => {
          const preference = member.user.deliveryPreferences[0];
          return !preference || (preference.emailEnabled && preference.weeklyDigest);
        })
        .map((member) => member.user.email);
      const overdueRecipients = organization.members
        .filter((member) => {
          const preference = member.user.deliveryPreferences[0];
          return !preference || (preference.emailEnabled && preference.overdueAlerts);
        })
        .map((member) => member.user.email);
      const run = await prisma.deliverableRun.upsert({
        where: {
          organizationId_type_periodStart_periodEnd: {
            organizationId: organization.id,
            type: "weekly_digest",
            periodStart,
            periodEnd
          }
        },
        update: { status: "GENERATED", payload: summary as unknown as Prisma.InputJsonValue },
        create: {
          organizationId: organization.id,
          type: "weekly_digest",
          periodStart,
          periodEnd,
          status: "GENERATED",
          payload: summary as unknown as Prisma.InputJsonValue
        }
      });
      const delivery = await deliverDigestEmail({ env, recipients, summary });
      if (summary.totals.overdueTasks > 0) {
        await deliverEmailMessage({
          env,
          recipients: overdueRecipients,
          subject: `${organization.name}: overdue SEO work`,
          text: [
            `${summary.totals.overdueTasks} overdue task${summary.totals.overdueTasks === 1 ? "" : "s"} need attention.`,
            "",
            `${(env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "")}/backlog`,
            "",
            "You can change alert delivery in workspace settings."
          ].join("\n")
        });
      }
      const status =
        recipients.length === 0 || delivery.skipped
          ? "SKIPPED"
          : delivery.sent > 0
            ? "DELIVERED"
            : "FAILED";

      await prisma.$transaction([
        prisma.deliverableRun.update({
          where: { id: run.id },
          data: {
            status,
            recipientCount: delivery.sent,
            deliveredAt: status === "DELIVERED" ? new Date() : null
          }
        }),
        prisma.notification.create({
          data: {
            organizationId: organization.id,
            type: "deliverable.weekly_digest",
            title: `Weekly digest ${input.startDate} to ${input.endDate}`,
            body: `${summary.totals.newCriticalFindings} new critical, ${summary.totals.significantTrafficDrops} traffic drops, ${summary.totals.completedTasks} completed, ${summary.totals.overdueTasks} overdue.`
          }
        }),
        ...(summary.totals.overdueTasks > 0
          ? [
              prisma.notification.create({
                data: {
                  organizationId: organization.id,
                  type: "deliverable.alert.overdue_work",
                  title: `${summary.totals.overdueTasks} overdue task${summary.totals.overdueTasks === 1 ? "" : "s"}`,
                  body: "The weekly review found unfinished work past its due date."
                }
              })
            ]
          : [])
      ]);

      if (status === "FAILED") throw new Error("WEEKLY_DIGEST_DELIVERY_FAILED");

      return { runId: run.id, status, recipients: recipients.length, delivered: delivery.sent };
    }
  };
}

async function organizationCanReceiveReports(
  prisma: Awaited<ReturnType<typeof getPrisma>>,
  organizationId: string
): Promise<boolean> {
  const subscription = await prisma.subscription.findFirst({
    where: {
      organizationId,
      status: { in: ["TRIALING", "ACTIVE", "PAST_DUE", "INCOMPLETE", "CANCELED"] }
    },
    include: { plan: true },
    orderBy: { updatedAt: "desc" }
  });
  const rawPlanCode = subscription?.plan.code ?? "TRIAL";
  const planCode = planCodes.includes(rawPlanCode as (typeof planCodes)[number])
    ? (rawPlanCode as (typeof planCodes)[number])
    : "TRIAL";

  return canUseEntitlement(
    resolveCommercialAccess({
      planCode,
      status: subscription?.status,
      provider: subscription?.provider,
      trialEndsAt: subscription?.trialEndsAt
    }),
    "recurringReports"
  );
}

async function deliverDigestEmail(input: {
  env: NodeJS.ProcessEnv;
  recipients: string[];
  summary: WorkspaceDeliverableSummary;
}): Promise<{ sent: number; skipped: boolean }> {
  const settingsUrl = `${(input.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "")}/settings#deliverables-title`;
  return deliverEmailMessage({
    env: input.env,
    recipients: input.recipients,
    subject: `${input.summary.organizationName}: weekly SEO digest`,
    text: composeDigestText(input.summary, settingsUrl)
  });
}

export async function deliverWorkspaceAlert(input: {
  env?: NodeJS.ProcessEnv;
  organizationId: string;
  preference: "failedOperationAlerts";
  title: string;
  body: string;
  actionPath: string;
}): Promise<{ sent: number; skipped: boolean }> {
  const env = input.env ?? process.env;
  const prisma = await getPrisma();
  const organization = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    select: {
      name: true,
      members: {
        where: { status: "ACTIVE" },
        select: {
          user: {
            select: {
              email: true,
              deliveryPreferences: {
                where: { organizationId: input.organizationId },
                select: { emailEnabled: true, failedOperationAlerts: true }
              }
            }
          }
        }
      }
    }
  });

  if (!organization) return { sent: 0, skipped: true };

  const recipients = organization.members
    .filter((member) => {
      const preference = member.user.deliveryPreferences[0];
      return !preference || (preference.emailEnabled && preference[input.preference]);
    })
    .map((member) => member.user.email);
  const actionUrl = `${(env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "")}${input.actionPath}`;

  return deliverEmailMessage({
    env,
    recipients,
    subject: `${organization.name}: ${input.title}`,
    text: [
      input.title,
      "",
      input.body,
      actionUrl ? `Review workspace: ${actionUrl}` : "",
      "",
      "You can change alert delivery in workspace settings."
    ]
      .filter(Boolean)
      .join("\n")
  });
}

async function deliverEmailMessage(input: {
  env: NodeJS.ProcessEnv;
  recipients: string[];
  subject: string;
  text: string;
}): Promise<{ sent: number; skipped: boolean }> {
  if (input.recipients.length === 0 || input.env.SCCC_EMAIL_TRANSPORT !== "smtp") {
    return { sent: 0, skipped: true };
  }

  const host = input.env.SCCC_SMTP_HOST?.trim();
  const port = Number(input.env.SCCC_SMTP_PORT ?? "587");
  const from = input.env.SCCC_EMAIL_FROM?.trim();

  if (!host || !from || !Number.isInteger(port)) throw new Error("SMTP_CONFIG_INVALID");

  const transport = nodemailer.createTransport({
    host,
    port,
    secure: input.env.SCCC_SMTP_SECURE === "true",
    auth: input.env.SCCC_SMTP_USER
      ? { user: input.env.SCCC_SMTP_USER, pass: input.env.SCCC_SMTP_PASSWORD ?? "" }
      : undefined
  });
  let sent = 0;

  for (const recipient of input.recipients) {
    await transport.sendMail({
      from,
      to: recipient,
      subject: input.subject,
      text: input.text
    });
    sent += 1;
  }

  return { sent, skipped: false };
}

function composeDigestText(summary: WorkspaceDeliverableSummary, settingsUrl: string): string {
  return [
    `${summary.organizationName} weekly SEO digest`,
    `${summary.period.startDate} to ${summary.period.endDate} UTC`,
    "",
    `New critical findings: ${summary.totals.newCriticalFindings}`,
    `Significant traffic drops: ${summary.totals.significantTrafficDrops}`,
    `Completed tasks: ${summary.totals.completedTasks}`,
    `Unresolved risks: ${summary.totals.unresolvedRisks}`,
    `Overdue tasks: ${summary.totals.overdueTasks}`,
    `Failed safe operations: ${summary.totals.failedOperations}`,
    `Improved outcomes: ${summary.totals.outcomes.improved}`,
    `Verified task improvements: ${summary.totals.taskOutcomes.improved}`,
    `Tasks awaiting verification: ${summary.totals.taskOutcomes.awaitingVerification}`,
    "",
    "Search outcome movement is correlation, not proof of causation.",
    settingsUrl ? `Delivery preferences: ${settingsUrl}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

function summarizeSite(input: {
  siteId: string;
  siteName: string;
  siteUrl: string;
  start: Date;
  endExclusive: Date;
  generatedAt: Date;
  issues: Array<{
    issueType: string;
    status: string;
    severity: string;
    evidence: unknown;
    createdAt: Date;
    updatedAt: Date;
  }>;
  tasks: Array<{
    status: string;
    dueDate: Date | null;
    updatedAt: Date;
    outcomeStatus: string | null;
    outcomeVerifiedAt: Date | null;
  }>;
  operations: Array<{ status: string; updatedAt: Date }>;
}): SiteDeliverableSummary {
  const inside = (value: Date) => value >= input.start && value < input.endExclusive;
  const outcomes: SiteDeliverableSummary["outcomes"] = {
    improved: 0,
    declined: 0,
    stable: 0,
    awaitingFollowup: 0
  };

  for (const issue of input.issues.filter((candidate) => inside(candidate.updatedAt))) {
    const status = readOutcomeStatus(issue.evidence);
    if (status === "awaiting_followup") outcomes.awaitingFollowup += 1;
    else if (status) outcomes[status] += 1;
  }
  const taskOutcomes: SiteDeliverableSummary["taskOutcomes"] = {
    improved: 0,
    stable: 0,
    declined: 0,
    inconclusive: 0,
    awaitingVerification: 0
  };

  for (const task of input.tasks) {
    if (task.outcomeStatus && task.outcomeVerifiedAt && inside(task.outcomeVerifiedAt)) {
      const key = task.outcomeStatus.toLowerCase() as keyof Omit<
        SiteDeliverableSummary["taskOutcomes"],
        "awaitingVerification"
      >;
      if (key in taskOutcomes) taskOutcomes[key] += 1;
    } else if (task.status === "DONE" && inside(task.updatedAt)) {
      taskOutcomes.awaitingVerification += 1;
    }
  }

  return {
    siteId: input.siteId,
    siteName: input.siteName,
    siteUrl: input.siteUrl,
    newCriticalFindings: input.issues.filter(
      (issue) => issue.severity === "CRITICAL" && inside(issue.createdAt)
    ).length,
    significantTrafficDrops: input.issues.filter(
      (issue) =>
        issue.issueType === "gsc.traffic-loss" &&
        issue.severity === "HIGH" &&
        inside(issue.createdAt)
    ).length,
    completedTasks: input.tasks.filter((task) => task.status === "DONE" && inside(task.updatedAt))
      .length,
    unresolvedRisks: input.issues.filter((issue) => issue.status === "OPEN").length,
    overdueTasks: input.tasks.filter(
      (task) =>
        task.dueDate &&
        task.dueDate < input.generatedAt &&
        !["DONE", "IGNORED"].includes(task.status)
    ).length,
    failedOperations: input.operations.filter(
      (operation) => operation.status === "FAILED" && inside(operation.updatedAt)
    ).length,
    outcomes,
    taskOutcomes
  };
}

function readOutcomeStatus(
  evidence: unknown
): "improved" | "declined" | "stable" | "awaiting_followup" | null {
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) return null;
  const impact = (evidence as Record<string, unknown>).searchImpact;
  if (!impact || typeof impact !== "object" || Array.isArray(impact)) return null;
  const outcome = (impact as Record<string, unknown>).outcome;
  if (!outcome || typeof outcome !== "object" || Array.isArray(outcome)) return null;
  const status = (outcome as Record<string, unknown>).status;
  return ["improved", "declined", "stable", "awaiting_followup"].includes(String(status))
    ? (status as "improved" | "declined" | "stable" | "awaiting_followup")
    : null;
}

function addUtcDays(value: Date, days: number): Date {
  const result = new Date(value);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}
