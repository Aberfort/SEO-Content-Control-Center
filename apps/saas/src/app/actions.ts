"use server";

import { revalidatePath } from "next/cache";
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
    await repository.inviteMember({
      user,
      organizationId: String(formData.get("organizationId") ?? ""),
      email: String(formData.get("email") ?? ""),
      role: String(formData.get("role") ?? "VIEWER") as never
    });
  } catch (error) {
    return actionError(error, "Could not invite member.");
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

export async function registerAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await registerWithPassword({
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? "")
    });
  } catch (error) {
    return actionError(error, "Could not create account.");
  }

  revalidatePath("/");
  redirect("/");
}

export async function loginAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await loginWithPassword({
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? "")
    });
  } catch (error) {
    return actionError(error, "Could not sign in.");
  }

  revalidatePath("/");
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await logoutCurrentSession();
  revalidatePath("/");
  redirect("/auth/login");
}

function actionError(error: unknown, fallback: string): ActionState {
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
