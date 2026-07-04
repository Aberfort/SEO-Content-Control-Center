"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ZodError } from "zod";

import { getAppRepository } from "@/lib/app-repository";
import {
  isAuthRequiredError,
  loginWithPassword,
  logoutCurrentSession,
  registerWithPassword,
  requireCurrentUser
} from "@/lib/auth";
import { assertServerActionSameOrigin, isCsrfError } from "@/lib/csrf";
import { sendInviteEmail } from "@/lib/email";
import {
  assertRateLimit,
  isRateLimitError,
  rateLimitKeyFromHeaders,
  type RateLimitPolicy
} from "@/lib/rate-limit";

export type ActionState = {
  ok: boolean;
  message: string;
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

export async function registerAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await assertServerActionSameOrigin();
    await assertServerActionRateLimit("auth-register", String(formData.get("email") ?? ""));
    await registerWithPassword({
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? "")
    });
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
      password: String(formData.get("password") ?? "")
    });
  } catch (error) {
    return actionError(error, "Could not sign in.");
  }

  revalidatePath("/");
  redirect(readRedirectTo(formData));
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

  if (error instanceof Error && error.message === "MEMBER_ALREADY_EXISTS") {
    return {
      ok: false,
      message: "This user is already a member of the organization."
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
      message: "Email or password is incorrect."
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

function readRedirectTo(formData: FormData): string {
  const redirectTo = String(formData.get("redirectTo") ?? "");

  if (!redirectTo.startsWith("/") || redirectTo.startsWith("//")) {
    return "/";
  }

  return redirectTo;
}

async function assertServerActionRateLimit(
  policy: RateLimitPolicy,
  discriminator: string
): Promise<void> {
  const headerStore = await headers();
  assertRateLimit(policy, rateLimitKeyFromHeaders(headerStore, discriminator));
}
