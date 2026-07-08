import { ZodError } from "zod";

import { getAppRepository } from "@/lib/app-repository";
import { getCurrentUser } from "@/lib/auth";
import { assertRequestSameOrigin } from "@/lib/csrf";
import { sendInviteEmail } from "@/lib/email";
import { jsonError, securityError, unauthorizedError, validationError } from "@/lib/http";
import { assertRateLimit, rateLimitKeyFromHeaders } from "@/lib/rate-limit";

type RouteContext = {
  params: Promise<{
    organizationId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorizedError();
  }

  const { organizationId } = await context.params;
  const repository = getAppRepository();

  try {
    return Response.json({
      data: await repository.listMembersForOrganization(user.id, organizationId)
    });
  } catch {
    return jsonError(404, "ORGANIZATION_NOT_FOUND", "Organization was not found.");
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    assertRequestSameOrigin(request);
  } catch (error) {
    const response = securityError(error);

    if (response) {
      return response;
    }

    throw error;
  }

  const user = await getCurrentUser();

  if (!user) {
    return unauthorizedError();
  }

  const { organizationId } = await context.params;
  const repository = getAppRepository();

  try {
    const body = (await request.json()) as unknown;
    assertRateLimit(
      "invite-send",
      rateLimitKeyFromHeaders(
        request.headers,
        `${user.id}:${organizationId}:${readString(body, "email")}`
      )
    );
    const invite = await repository.inviteMember({
      user,
      organizationId,
      email: readString(body, "email"),
      role: readString(body, "role") as never
    });
    const organization = await repository.getOrganizationSummary(user.id, organizationId);
    const emailDelivery = await sendInviteEmail({
      to: invite.member.email,
      inviteUrl: invite.inviteUrl,
      organizationName: organization?.name ?? "your workspace",
      inviterEmail: user.email,
      role: invite.member.role,
      expiresAt: invite.expiresAt
    });

    return Response.json({ data: invite, emailDelivery }, { status: 201 });
  } catch (error) {
    const response = securityError(error);

    if (response) {
      return response;
    }

    if (error instanceof ZodError) {
      return validationError(error);
    }

    if (error instanceof Error && error.message === "MEMBER_ALREADY_EXISTS") {
      return jsonError(409, "MEMBER_ALREADY_EXISTS", "This user is already a member.");
    }

    if (error instanceof Error && error.message === "PLAN_USER_LIMIT_REACHED") {
      return jsonError(402, "PLAN_USER_LIMIT_REACHED", "Current plan user limit reached.");
    }

    if (error instanceof Error && error.message === "BILLING_TRIAL_EXPIRED") {
      return jsonError(402, "BILLING_TRIAL_EXPIRED", "Trial has expired. Upgrade to continue.");
    }

    if (error instanceof Error && error.message.startsWith("Role ")) {
      return jsonError(403, "FORBIDDEN", "Your role does not allow inviting members.");
    }

    return jsonError(404, "ORGANIZATION_NOT_FOUND", "Organization was not found.");
  }
}

function readString(input: unknown, key: string): string {
  if (typeof input !== "object" || input === null || !(key in input)) {
    return "";
  }

  const value = (input as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}
