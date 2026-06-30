import { ZodError } from "zod";

import { getAppRepository } from "@/lib/app-repository";
import { getCurrentUser } from "@/lib/auth";
import { assertRequestSameOrigin } from "@/lib/csrf";
import { jsonError, securityError, unauthorizedError, validationError } from "@/lib/http";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorizedError();
  }

  const repository = getAppRepository();
  return Response.json({ data: await repository.listOrganizationSummariesForUser(user) });
}

export async function POST(request: Request) {
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

  const repository = getAppRepository();

  try {
    const body = (await request.json()) as unknown;
    const organization = await repository.createOrganization({
      user,
      name: readString(body, "name")
    });

    return Response.json({ data: organization }, { status: 201 });
  } catch (error) {
    const response = securityError(error);

    if (response) {
      return response;
    }

    if (error instanceof ZodError) {
      return validationError(error);
    }

    return jsonError(400, "ORGANIZATION_CREATE_FAILED", "Could not create organization.");
  }
}

function readString(input: unknown, key: string): string {
  if (typeof input !== "object" || input === null || !(key in input)) {
    return "";
  }

  const value = (input as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}
