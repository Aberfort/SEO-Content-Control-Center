"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { billingCheckoutCreateSchema } from "@sccc/shared";
import { ZodError } from "zod";

import { getAppRepository } from "@/lib/app-repository";
import {
  isAuthRequiredError,
  loginWithPassword,
  logoutCurrentSession,
  registerWithPassword,
  requireCurrentUser
} from "@/lib/auth";
import { createBillingCheckoutSession } from "@/lib/billing-checkout";
import { createBillingPortalSession } from "@/lib/billing-portal";
import { buildBulkOperationRateLimitKey } from "@/lib/bulk-operation-rate-limit";
import { assertServerActionSameOrigin, isCsrfError } from "@/lib/csrf";
import { sendEmailVerificationEmail, sendInviteEmail, sendPasswordResetEmail } from "@/lib/email";
import { createEmailVerificationRequestForUser } from "@/lib/email-verification";
import { syncGscSearchInsightsForSite } from "@/lib/gsc-insights";
import { syncGscDailyMetricsForSite } from "@/lib/gsc-metrics";
import { createPasswordResetRequest, resetPasswordWithToken } from "@/lib/password-reset";
import { disconnectPluginConnection } from "@/lib/plugin-connection";
import {
  assertRateLimit,
  isRateLimitError,
  rateLimitKeyFromHeaders,
  type RateLimitPolicy
} from "@/lib/rate-limit";
import {
  confirmTwoFactorEnrollment,
  disableTwoFactorForUser,
  startTwoFactorEnrollment
} from "@/lib/two-factor";

export type ActionState = {
  ok: boolean;
  message: string;
  code?: string;
  twoFactorSetup?: {
    secret: string;
    otpauthUrl: string;
  };
};

export async function createOrganizationAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { user } = await requireCurrentUser();
  const repository = getAppRepository();

  try {
    await assertServerActionSameOrigin();
    await repository.createOrganization({
      user,
      name: String(formData.get("name") ?? "")
    });
  } catch (error) {
    return actionError(error, "Could not create organization.");
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
  redirect("/");
}

export async function createSiteAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { user } = await requireCurrentUser();
  const repository = getAppRepository();

  try {
    await assertServerActionSameOrigin();
    await repository.createSite({
      user,
      organizationId: String(formData.get("organizationId") ?? ""),
      name: String(formData.get("name") ?? ""),
      url: String(formData.get("url") ?? "")
    });
  } catch (error) {
    return actionError(error, "Could not create site.");
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
  redirect("/");
}

export async function disconnectPluginConnectionAction(formData: FormData): Promise<void> {
  const { user } = await requireCurrentUser();
  const redirectTo = String(formData.get("redirectTo") ?? "/");

  await assertServerActionSameOrigin();
  await disconnectPluginConnection({
    user,
    organizationId: String(formData.get("organizationId") ?? ""),
    siteId: String(formData.get("siteId") ?? "")
  });

  revalidatePath("/");
  revalidatePath("/dashboard");
  redirect(redirectTo.startsWith("/") ? redirectTo : "/");
}

export async function createBillingCheckoutSessionAction(formData: FormData): Promise<void> {
  const { user } = await requireCurrentUser();
  const repository = getAppRepository();
  let checkoutUrl = "";

  try {
    await assertServerActionSameOrigin();
    const parsed = billingCheckoutCreateSchema.parse({
      planCode: String(formData.get("planCode") ?? "")
    });
    const checkoutContext = await repository.getBillingCheckoutContext({
      user,
      organizationId: String(formData.get("organizationId") ?? ""),
      planCode: parsed.planCode
    });
    const session = await createBillingCheckoutSession({
      context: checkoutContext,
      origin: requestOriginFromHeaders(await headers())
    });
    checkoutUrl = session.url;
  } catch (error) {
    const state = actionError(error, "Could not create checkout session.");
    redirect(`/dashboard?billing=error&message=${encodeURIComponent(state.message)}`);
  }

  redirect(checkoutUrl);
}

export async function createBillingPortalSessionAction(formData: FormData): Promise<void> {
  const { user } = await requireCurrentUser();
  const repository = getAppRepository();
  let portalUrl = "";

  try {
    await assertServerActionSameOrigin();
    const portalContext = await repository.getBillingPortalContext({
      user,
      organizationId: String(formData.get("organizationId") ?? "")
    });
    const session = await createBillingPortalSession({
      context: portalContext,
      origin: requestOriginFromHeaders(await headers())
    });
    portalUrl = session.url;
  } catch (error) {
    const state = actionError(error, "Could not create billing portal session.");
    redirect(`/dashboard?billing=error&message=${encodeURIComponent(state.message)}`);
  }

  redirect(portalUrl);
}

export async function syncGscDailyMetricsAction(formData: FormData): Promise<void> {
  const { user } = await requireCurrentUser();
  const redirectTo = readRedirectTo(formData);

  try {
    await assertServerActionSameOrigin();
    await syncGscDailyMetricsForSite({
      user,
      organizationId: String(formData.get("organizationId") ?? ""),
      siteId: String(formData.get("siteId") ?? ""),
      startDate: String(formData.get("startDate") ?? "") || undefined,
      endDate: String(formData.get("endDate") ?? "") || undefined
    });
  } catch (error) {
    const state = actionError(error, "Could not sync Search Console metrics.");
    redirect(buildGscRedirect(redirectTo, "error", state.message));
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
  redirect(buildGscRedirect(redirectTo, "metrics_synced"));
}

export async function syncGscSearchInsightsAction(formData: FormData): Promise<void> {
  const { user } = await requireCurrentUser();
  const redirectTo = readRedirectTo(formData);

  try {
    await assertServerActionSameOrigin();
    await syncGscSearchInsightsForSite({
      user,
      organizationId: String(formData.get("organizationId") ?? ""),
      siteId: String(formData.get("siteId") ?? ""),
      startDate: String(formData.get("startDate") ?? "") || undefined,
      endDate: String(formData.get("endDate") ?? "") || undefined
    });
  } catch (error) {
    const state = actionError(error, "Could not sync Search Console insights.");
    redirect(buildGscRedirect(redirectTo, "error", state.message));
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
  redirect(buildGscRedirect(redirectTo, "insights_synced"));
}

export async function inviteMemberAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { user } = await requireCurrentUser();
  const repository = getAppRepository();

  try {
    await assertServerActionSameOrigin();
    await assertServerActionRateLimit(
      "invite-send",
      `${user.id}:${String(formData.get("organizationId") ?? "")}:${String(formData.get("email") ?? "")}`
    );
    const invite = await repository.inviteMember({
      user,
      organizationId: String(formData.get("organizationId") ?? ""),
      email: String(formData.get("email") ?? ""),
      role: String(formData.get("role") ?? "VIEWER") as never
    });
    const organization = await repository.getOrganizationSummary(
      user.id,
      invite.member.organizationId
    );
    const emailDelivery = await sendInviteEmail({
      to: invite.member.email,
      inviteUrl: invite.inviteUrl,
      organizationName: organization?.name ?? "your workspace",
      inviterEmail: user.email,
      role: invite.member.role,
      expiresAt: invite.expiresAt
    });

    if (emailDelivery.status === "failed") {
      return {
        ok: false,
        message: "Invite was created, but the email could not be sent."
      };
    }
  } catch (error) {
    return actionError(error, "Could not invite member.");
  }

  revalidatePath("/");
  redirect("/");
}

export async function resendInviteAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { user } = await requireCurrentUser();
  const repository = getAppRepository();

  try {
    await assertServerActionSameOrigin();
    await assertServerActionRateLimit(
      "invite-send",
      `${user.id}:${String(formData.get("organizationId") ?? "")}:${String(formData.get("memberId") ?? "")}`
    );
    const invite = await repository.resendInvite({
      user,
      organizationId: String(formData.get("organizationId") ?? ""),
      memberId: String(formData.get("memberId") ?? "")
    });
    const organization = await repository.getOrganizationSummary(
      user.id,
      invite.member.organizationId
    );
    const emailDelivery = await sendInviteEmail({
      to: invite.member.email,
      inviteUrl: invite.inviteUrl,
      organizationName: organization?.name ?? "your workspace",
      inviterEmail: user.email,
      role: invite.member.role,
      expiresAt: invite.expiresAt
    });

    if (emailDelivery.status === "failed") {
      return {
        ok: false,
        message: "Invite was rotated, but the email could not be sent."
      };
    }
  } catch (error) {
    return actionError(error, "Could not resend invite.");
  }

  revalidatePath("/");
  redirect("/");
}

export async function cancelInviteAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { user } = await requireCurrentUser();
  const repository = getAppRepository();

  try {
    await assertServerActionSameOrigin();
    await repository.cancelInvite({
      user,
      organizationId: String(formData.get("organizationId") ?? ""),
      memberId: String(formData.get("memberId") ?? "")
    });
  } catch (error) {
    return actionError(error, "Could not cancel invite.");
  }

  revalidatePath("/");
  redirect("/");
}

export async function acceptInviteAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { user } = await requireCurrentUser();
  const repository = getAppRepository();

  try {
    await assertServerActionSameOrigin();
    await assertServerActionRateLimit("invite-accept", String(formData.get("token") ?? ""));
    await repository.acceptInvite({
      user,
      token: String(formData.get("token") ?? "")
    });
  } catch (error) {
    return actionError(error, "Could not accept invite.");
  }

  revalidatePath("/");
  redirect("/");
}

export async function updateMemberRoleAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { user } = await requireCurrentUser();
  const repository = getAppRepository();

  try {
    await assertServerActionSameOrigin();
    await repository.updateMemberRole({
      user,
      organizationId: String(formData.get("organizationId") ?? ""),
      memberId: String(formData.get("memberId") ?? ""),
      role: String(formData.get("role") ?? "VIEWER") as never
    });
  } catch (error) {
    return actionError(error, "Could not update member role.");
  }

  revalidatePath("/");
  redirect("/");
}

export async function createAuditForSiteAction(formData: FormData): Promise<void> {
  const { user } = await requireCurrentUser();
  const repository = getAppRepository();
  const redirectTo = String(formData.get("redirectTo") ?? "/");

  await assertServerActionSameOrigin();
  await repository.createAuditForSite({
    user,
    organizationId: String(formData.get("organizationId") ?? ""),
    siteId: String(formData.get("siteId") ?? "")
  });

  revalidatePath("/");
  redirect(redirectTo.startsWith("/") ? redirectTo : "/");
}

export async function updateAuditIssueStatusAction(formData: FormData): Promise<void> {
  const { user } = await requireCurrentUser();
  const repository = getAppRepository();
  const redirectTo = String(formData.get("redirectTo") ?? "/");

  await assertServerActionSameOrigin();
  await repository.updateAuditIssueStatus({
    user,
    organizationId: String(formData.get("organizationId") ?? ""),
    siteId: String(formData.get("siteId") ?? ""),
    auditId: String(formData.get("auditId") ?? ""),
    issueId: String(formData.get("issueId") ?? ""),
    status: String(formData.get("status") ?? "OPEN") as never
  });

  revalidatePath("/");
  redirect(redirectTo.startsWith("/") ? redirectTo : "/");
}

export async function createBacklogTaskFromAuditIssueAction(formData: FormData): Promise<void> {
  const { user } = await requireCurrentUser();
  const repository = getAppRepository();
  const redirectTo = String(formData.get("redirectTo") ?? "/");

  await assertServerActionSameOrigin();
  await repository.createBacklogTaskFromAuditIssue({
    user,
    organizationId: String(formData.get("organizationId") ?? ""),
    siteId: String(formData.get("siteId") ?? ""),
    auditIssueId: String(formData.get("auditIssueId") ?? "")
  });

  revalidatePath("/");
  redirect(redirectTo.startsWith("/") ? redirectTo : "/");
}

export async function createBacklogTasksFromAuditAction(formData: FormData): Promise<void> {
  const { user } = await requireCurrentUser();
  const repository = getAppRepository();
  const redirectTo = String(formData.get("redirectTo") ?? "/");

  await assertServerActionSameOrigin();
  await repository.createBacklogTasksFromAudit({
    user,
    organizationId: String(formData.get("organizationId") ?? ""),
    siteId: String(formData.get("siteId") ?? ""),
    auditId: String(formData.get("auditId") ?? ""),
    status: String(formData.get("status") ?? "OPEN") as never
  });

  revalidatePath("/");
  redirect(redirectTo.startsWith("/") ? redirectTo : "/");
}

export async function createBacklogTaskFromCandidateAction(formData: FormData): Promise<void> {
  const { user } = await requireCurrentUser();
  const repository = getAppRepository();
  const redirectTo = String(formData.get("redirectTo") ?? "/");

  await assertServerActionSameOrigin();
  await repository.createBacklogTaskFromCandidate({
    user,
    organizationId: String(formData.get("organizationId") ?? ""),
    siteId: String(formData.get("siteId") ?? ""),
    contentItemId: String(formData.get("contentItemId") ?? ""),
    candidateId: String(formData.get("candidateId") ?? "")
  });

  revalidatePath("/");
  redirect(redirectTo.startsWith("/") ? redirectTo : "/");
}

export async function updateBacklogTaskStatusAction(formData: FormData): Promise<void> {
  const { user } = await requireCurrentUser();
  const repository = getAppRepository();
  const redirectTo = String(formData.get("redirectTo") ?? "/");

  await assertServerActionSameOrigin();
  await repository.updateBacklogTaskStatus({
    user,
    organizationId: String(formData.get("organizationId") ?? ""),
    siteId: String(formData.get("siteId") ?? ""),
    taskId: String(formData.get("taskId") ?? ""),
    status: String(formData.get("status") ?? "TODO") as never
  });

  revalidatePath("/");
  redirect(redirectTo.startsWith("/") ? redirectTo : "/");
}

export async function updateBacklogTaskAssignmentAction(formData: FormData): Promise<void> {
  const { user } = await requireCurrentUser();
  const repository = getAppRepository();
  const redirectTo = String(formData.get("redirectTo") ?? "/");
  const assigneeId = String(formData.get("assigneeId") ?? "");
  const dueDate = String(formData.get("dueDate") ?? "");

  await assertServerActionSameOrigin();
  await repository.updateBacklogTaskAssignment({
    user,
    organizationId: String(formData.get("organizationId") ?? ""),
    siteId: String(formData.get("siteId") ?? ""),
    taskId: String(formData.get("taskId") ?? ""),
    assigneeId: assigneeId || null,
    dueDate: dueDate || null
  });

  revalidatePath("/");
  redirect(redirectTo.startsWith("/") ? redirectTo : "/");
}

export async function createBacklogTaskCommentAction(formData: FormData): Promise<void> {
  const { user } = await requireCurrentUser();
  const repository = getAppRepository();
  const redirectTo = String(formData.get("redirectTo") ?? "/");

  await assertServerActionSameOrigin();
  await repository.createBacklogTaskComment({
    user,
    organizationId: String(formData.get("organizationId") ?? ""),
    siteId: String(formData.get("siteId") ?? ""),
    taskId: String(formData.get("taskId") ?? ""),
    body: String(formData.get("body") ?? "")
  });

  revalidatePath("/");
  redirect(redirectTo.startsWith("/") ? redirectTo : "/");
}

export async function createBulkOperationPreviewAction(formData: FormData): Promise<void> {
  const { user } = await requireCurrentUser();
  const repository = getAppRepository();
  const redirectTo = String(formData.get("redirectTo") ?? "/");

  await assertServerActionSameOrigin();
  await assertBulkOperationServerActionRateLimit(user.id, formData, "preview");
  await repository.createBulkOperationPreview({
    user,
    organizationId: String(formData.get("organizationId") ?? ""),
    siteId: String(formData.get("siteId") ?? ""),
    taskId: String(formData.get("taskId") ?? "")
  });

  revalidatePath("/");
  redirect(redirectTo.startsWith("/") ? redirectTo : "/");
}

export async function runBulkOperationDryRunAction(formData: FormData): Promise<void> {
  const { user } = await requireCurrentUser();
  const repository = getAppRepository();
  const redirectTo = String(formData.get("redirectTo") ?? "/");

  await assertServerActionSameOrigin();
  await assertBulkOperationServerActionRateLimit(user.id, formData, "dry-run");
  await repository.runBulkOperationDryRun({
    user,
    organizationId: String(formData.get("organizationId") ?? ""),
    siteId: String(formData.get("siteId") ?? ""),
    operationId: String(formData.get("operationId") ?? "")
  });

  revalidatePath("/");
  redirect(redirectTo.startsWith("/") ? redirectTo : "/");
}

export async function confirmBulkOperationAction(formData: FormData): Promise<void> {
  const { user } = await requireCurrentUser();
  const repository = getAppRepository();
  const redirectTo = String(formData.get("redirectTo") ?? "/");

  await assertServerActionSameOrigin();
  await assertBulkOperationServerActionRateLimit(user.id, formData, "confirm");
  await repository.confirmBulkOperation({
    user,
    organizationId: String(formData.get("organizationId") ?? ""),
    siteId: String(formData.get("siteId") ?? ""),
    operationId: String(formData.get("operationId") ?? ""),
    confirmation: String(formData.get("confirmation") ?? "") as never
  });

  revalidatePath("/");
  redirect(redirectTo.startsWith("/") ? redirectTo : "/");
}

export async function startBulkOperationAction(formData: FormData): Promise<void> {
  const { user } = await requireCurrentUser();
  const repository = getAppRepository();
  const redirectTo = String(formData.get("redirectTo") ?? "/");

  await assertServerActionSameOrigin();
  await assertBulkOperationServerActionRateLimit(user.id, formData, "start");
  await repository.startBulkOperation({
    user,
    organizationId: String(formData.get("organizationId") ?? ""),
    siteId: String(formData.get("siteId") ?? ""),
    operationId: String(formData.get("operationId") ?? "")
  });

  revalidatePath("/");
  redirect(redirectTo.startsWith("/") ? redirectTo : "/");
}

export async function finishBulkOperationAction(formData: FormData): Promise<void> {
  const { user } = await requireCurrentUser();
  const repository = getAppRepository();
  const redirectTo = String(formData.get("redirectTo") ?? "/");

  await assertServerActionSameOrigin();
  await assertBulkOperationServerActionRateLimit(user.id, formData, "result");
  await repository.finishBulkOperation({
    user,
    organizationId: String(formData.get("organizationId") ?? ""),
    siteId: String(formData.get("siteId") ?? ""),
    operationId: String(formData.get("operationId") ?? ""),
    status: String(formData.get("status") ?? "") as never,
    message: String(formData.get("message") ?? "") || undefined
  });

  revalidatePath("/");
  redirect(redirectTo.startsWith("/") ? redirectTo : "/");
}

export async function rollbackBulkOperationAction(formData: FormData): Promise<void> {
  const { user } = await requireCurrentUser();
  const repository = getAppRepository();
  const redirectTo = String(formData.get("redirectTo") ?? "/");

  await assertServerActionSameOrigin();
  await assertBulkOperationServerActionRateLimit(user.id, formData, "rollback");
  await repository.rollbackBulkOperation({
    user,
    organizationId: String(formData.get("organizationId") ?? ""),
    siteId: String(formData.get("siteId") ?? ""),
    operationId: String(formData.get("operationId") ?? ""),
    reason: String(formData.get("reason") ?? "") || undefined
  });

  revalidatePath("/");
  redirect(redirectTo.startsWith("/") ? redirectTo : "/");
}

export async function retryBulkOperationAction(formData: FormData): Promise<void> {
  const { user } = await requireCurrentUser();
  const repository = getAppRepository();
  const redirectTo = String(formData.get("redirectTo") ?? "/");

  await assertServerActionSameOrigin();
  await assertBulkOperationServerActionRateLimit(user.id, formData, "retry");
  await repository.retryBulkOperation({
    user,
    organizationId: String(formData.get("organizationId") ?? ""),
    siteId: String(formData.get("siteId") ?? ""),
    operationId: String(formData.get("operationId") ?? ""),
    reason: String(formData.get("reason") ?? "") || undefined
  });

  revalidatePath("/");
  redirect(redirectTo.startsWith("/") ? redirectTo : "/");
}

export async function updateNotificationReadStateAction(formData: FormData): Promise<void> {
  const { user } = await requireCurrentUser();
  const repository = getAppRepository();
  const redirectTo = String(formData.get("redirectTo") ?? "/");

  await assertServerActionSameOrigin();
  await repository.updateNotificationReadState({
    user,
    organizationId: String(formData.get("organizationId") ?? ""),
    notificationId: String(formData.get("notificationId") ?? ""),
    read: String(formData.get("read") ?? "") === "true"
  });

  revalidatePath("/");
  redirect(redirectTo.startsWith("/") ? redirectTo : "/");
}

export async function markAllNotificationsReadAction(formData: FormData): Promise<void> {
  const { user } = await requireCurrentUser();
  const repository = getAppRepository();
  const redirectTo = String(formData.get("redirectTo") ?? "/");

  await assertServerActionSameOrigin();
  await repository.markAllNotificationsRead(user, String(formData.get("organizationId") ?? ""));

  revalidatePath("/");
  redirect(redirectTo.startsWith("/") ? redirectTo : "/");
}

export async function registerAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await assertServerActionSameOrigin();
    await assertServerActionRateLimit("auth-register", String(formData.get("email") ?? ""));
    const user = await registerWithPassword({
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? "")
    });
    const verification = await createEmailVerificationRequestForUser(user.id);

    if (verification) {
      await sendEmailVerificationEmail({
        to: verification.email,
        name: verification.name,
        verificationUrl: verification.verificationUrl,
        expiresAt: verification.expiresAt
      });
    }
  } catch (error) {
    return actionError(error, "Could not create account.");
  }

  revalidatePath("/");
  redirect(readRedirectTo(formData));
}

export async function loginAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await assertServerActionSameOrigin();
    await assertServerActionRateLimit("auth-login", String(formData.get("email") ?? ""));
    await loginWithPassword({
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      twoFactorCode: String(formData.get("twoFactorCode") ?? "")
    });
  } catch (error) {
    return actionError(error, "Could not sign in.");
  }

  revalidatePath("/");
  redirect(readRedirectTo(formData));
}

export async function startTwoFactorSetupAction(
  _previousState: ActionState,
  _formData: FormData
): Promise<ActionState> {
  void _previousState;
  void _formData;

  const { user } = await requireCurrentUser();

  try {
    await assertServerActionSameOrigin();
    await assertServerActionRateLimit("auth-2fa", user.id);
    const setup = await startTwoFactorEnrollment(user.id);

    return {
      ok: true,
      message: "Authenticator setup started.",
      twoFactorSetup: setup
    };
  } catch (error) {
    return actionError(error, "Could not start authenticator setup.");
  }
}

export async function confirmTwoFactorSetupAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { user } = await requireCurrentUser();

  try {
    await assertServerActionSameOrigin();
    await assertServerActionRateLimit("auth-2fa", user.id);
    await confirmTwoFactorEnrollment({
      userId: user.id,
      code: String(formData.get("twoFactorCode") ?? "")
    });
  } catch (error) {
    return actionError(error, "Could not enable authenticator verification.");
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
  return {
    ok: true,
    message: "Authenticator verification is enabled."
  };
}

export async function disableTwoFactorAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { user } = await requireCurrentUser();

  try {
    await assertServerActionSameOrigin();
    await assertServerActionRateLimit("auth-2fa", user.id);
    await disableTwoFactorForUser({
      userId: user.id,
      code: String(formData.get("twoFactorCode") ?? "")
    });
  } catch (error) {
    return actionError(error, "Could not disable authenticator verification.");
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
  return {
    ok: true,
    message: "Authenticator verification is disabled."
  };
}

export async function requestPasswordResetAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await assertServerActionSameOrigin();
    await assertServerActionRateLimit("auth-password-reset", String(formData.get("email") ?? ""));
    const reset = await createPasswordResetRequest({
      email: String(formData.get("email") ?? "")
    });

    if (reset) {
      await sendPasswordResetEmail({
        to: reset.email,
        name: reset.name,
        resetUrl: reset.resetUrl,
        expiresAt: reset.expiresAt
      });
    }
  } catch (error) {
    return actionError(error, "Could not start password reset.");
  }

  return {
    ok: true,
    message: "If an account exists for this email, a reset link has been sent."
  };
}

export async function confirmPasswordResetAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await assertServerActionSameOrigin();
    await assertServerActionRateLimit("auth-password-reset", String(formData.get("token") ?? ""));
    await resetPasswordWithToken({
      token: String(formData.get("token") ?? ""),
      password: String(formData.get("password") ?? "")
    });
  } catch (error) {
    return actionError(error, "Could not reset password.");
  }

  return {
    ok: true,
    message: "Password reset. You can now sign in with the new password."
  };
}

export async function logoutAction(): Promise<void> {
  await assertServerActionSameOrigin();
  await logoutCurrentSession();
  revalidatePath("/");
  redirect("/auth/login");
}

function actionError(error: unknown, fallback: string): ActionState {
  if (isCsrfError(error)) {
    return {
      ok: false,
      message: "Request origin is not allowed. Refresh the page and try again."
    };
  }

  if (isRateLimitError(error)) {
    return {
      ok: false,
      message: "Too many attempts. Please try again later."
    };
  }

  if (error instanceof ZodError) {
    return {
      ok: false,
      message: "Please check the form fields and try again."
    };
  }

  if (error instanceof Error && error.message === "SITE_ALREADY_EXISTS") {
    return {
      ok: false,
      message: "This site already exists in the selected organization."
    };
  }

  if (error instanceof Error && error.message === "PLAN_SITE_LIMIT_REACHED") {
    return {
      ok: false,
      message: "Your current plan has reached its site limit."
    };
  }

  if (error instanceof Error && error.message === "BILLING_TRIAL_EXPIRED") {
    return {
      ok: false,
      message: "Your trial has expired. Upgrade to continue."
    };
  }

  if (error instanceof Error && error.message === "MEMBER_ALREADY_EXISTS") {
    return {
      ok: false,
      message: "This user is already a member of the organization."
    };
  }

  if (error instanceof Error && error.message === "PLAN_USER_LIMIT_REACHED") {
    return {
      ok: false,
      message: "Your current plan has reached its user limit."
    };
  }

  if (error instanceof Error && error.message === "BILLING_PROVIDER_NOT_CONFIGURED") {
    return {
      ok: false,
      message: "Billing provider is not configured."
    };
  }

  if (error instanceof Error && error.message === "BILLING_PRICE_NOT_CONFIGURED") {
    return {
      ok: false,
      message: "Checkout session is not configured for this plan."
    };
  }

  if (error instanceof Error && error.message === "BILLING_SUBSCRIPTION_NOT_FOUND") {
    return {
      ok: false,
      message: "No paid subscription is connected."
    };
  }

  if (error instanceof Error && error.message === "BILLING_PORTAL_CUSTOMER_NOT_CONFIGURED") {
    return {
      ok: false,
      message: "Billing portal session is not configured for this subscription."
    };
  }

  if (error instanceof Error && error.message === "BILLING_CURRENT_PLAN_SELECTED") {
    return {
      ok: false,
      message: "This is already the current plan."
    };
  }

  if (error instanceof Error && error.message === "BILLING_TRIAL_REQUIRES_INTERNAL_FLOW") {
    return {
      ok: false,
      message: "Trial changes require an internal downgrade workflow."
    };
  }

  if (error instanceof Error && error.message === "BILLING_ENTERPRISE_REQUIRES_SALES") {
    return {
      ok: false,
      message: "Enterprise plan changes require a sales-assisted workflow."
    };
  }

  if (error instanceof Error && error.message === "CANNOT_CHANGE_OWN_ROLE") {
    return {
      ok: false,
      message: "You cannot change your own role."
    };
  }

  if (error instanceof Error && error.message === "OWNER_ROLE_IS_PROTECTED") {
    return {
      ok: false,
      message: "Owner role changes require a dedicated ownership transfer flow."
    };
  }

  if (error instanceof Error && error.message === "MEMBER_NOT_FOUND") {
    return {
      ok: false,
      message: "Member was not found."
    };
  }

  if (error instanceof Error && error.message === "INVITE_NOT_PENDING") {
    return {
      ok: false,
      message: "This invite is no longer pending."
    };
  }

  if (error instanceof Error && error.message === "INVITE_NOT_FOUND") {
    return {
      ok: false,
      message: "This invite link was not found."
    };
  }

  if (error instanceof Error && error.message === "INVITE_EXPIRED") {
    return {
      ok: false,
      message: "This invite link has expired. Ask an admin to resend it."
    };
  }

  if (error instanceof Error && error.message === "INVITE_EMAIL_MISMATCH") {
    return {
      ok: false,
      message: "Sign in with the email address that received this invite."
    };
  }

  if (error instanceof Error && error.message === "EMAIL_ALREADY_REGISTERED") {
    return {
      ok: false,
      message: "An account with this email already exists."
    };
  }

  if (error instanceof Error && error.message === "INVALID_CREDENTIALS") {
    return {
      ok: false,
      code: "INVALID_CREDENTIALS",
      message: "Email or password is incorrect."
    };
  }

  if (error instanceof Error && error.message === "TWO_FACTOR_REQUIRED") {
    return {
      ok: false,
      code: "TWO_FACTOR_REQUIRED",
      message: "Enter the authenticator code for this account."
    };
  }

  if (error instanceof Error && error.message === "INVALID_TWO_FACTOR_CODE") {
    return {
      ok: false,
      code: "INVALID_TWO_FACTOR_CODE",
      message: "Authenticator code is incorrect or already used."
    };
  }

  if (error instanceof Error && error.message === "TWO_FACTOR_SETUP_NOT_STARTED") {
    return {
      ok: false,
      code: "TWO_FACTOR_SETUP_NOT_STARTED",
      message: "Start authenticator setup before confirming the code."
    };
  }

  if (error instanceof Error && error.message === "TWO_FACTOR_ALREADY_ENABLED") {
    return {
      ok: false,
      code: "TWO_FACTOR_ALREADY_ENABLED",
      message: "Authenticator verification is already enabled."
    };
  }

  if (
    error instanceof Error &&
    (error.message === "TOKEN_ENCRYPTION_KEY_NOT_CONFIGURED" ||
      error.message === "TWO_FACTOR_CONFIGURATION_INVALID")
  ) {
    return {
      ok: false,
      code: error.message,
      message: "Authenticator verification requires token encryption to be configured."
    };
  }

  if (error instanceof Error && error.message === "TWO_FACTOR_NOT_ENABLED") {
    return {
      ok: false,
      code: "TWO_FACTOR_NOT_ENABLED",
      message: "Authenticator verification is not enabled."
    };
  }

  if (error instanceof Error && error.message === "PASSWORD_RESET_TOKEN_NOT_FOUND") {
    return {
      ok: false,
      message: "This password reset link was not found."
    };
  }

  if (error instanceof Error && error.message === "PASSWORD_RESET_TOKEN_USED") {
    return {
      ok: false,
      message: "This password reset link was already used."
    };
  }

  if (error instanceof Error && error.message === "PASSWORD_RESET_TOKEN_EXPIRED") {
    return {
      ok: false,
      message: "This password reset link has expired. Request a fresh link."
    };
  }

  if (error instanceof Error && error.message.startsWith("Role ")) {
    return {
      ok: false,
      message: "Your role does not allow this action."
    };
  }

  if (isAuthRequiredError(error)) {
    return {
      ok: false,
      message: "Please sign in before continuing."
    };
  }

  return {
    ok: false,
    message: fallback
  };
}

function requestOriginFromHeaders(headerStore: {
  get(name: string): string | null;
}): string | null {
  const origin = headerStore.get("origin");

  if (origin) {
    return origin;
  }

  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const protocol = headerStore.get("x-forwarded-proto") ?? "http";
  return host ? `${protocol}://${host}` : null;
}

function readRedirectTo(formData: FormData): string {
  const redirectTo = String(formData.get("redirectTo") ?? "");

  if (!redirectTo.startsWith("/") || redirectTo.startsWith("//")) {
    return "/";
  }

  return redirectTo;
}

function buildGscRedirect(
  redirectTo: string,
  status: "metrics_synced" | "insights_synced" | "error",
  message?: string
): string {
  const url = new URL(redirectTo, "http://localhost");
  url.searchParams.set("gsc", status);

  if (message) {
    url.searchParams.set("message", message);
  } else {
    url.searchParams.delete("message");
  }

  url.hash = "gsc-title";
  return `${url.pathname}${url.search}${url.hash}`;
}

async function assertServerActionRateLimit(
  policy: RateLimitPolicy,
  discriminator: string
): Promise<void> {
  const headerStore = await headers();
  await assertRateLimit(policy, rateLimitKeyFromHeaders(headerStore, discriminator));
}

async function assertBulkOperationServerActionRateLimit(
  userId: string,
  formData: FormData,
  action: string
): Promise<void> {
  await assertServerActionRateLimit(
    "bulk-operation",
    buildBulkOperationRateLimitKey({
      userId,
      organizationId: String(formData.get("organizationId") ?? ""),
      siteId: String(formData.get("siteId") ?? ""),
      operationId: String(formData.get("operationId") ?? "") || undefined,
      action
    })
  );
}
