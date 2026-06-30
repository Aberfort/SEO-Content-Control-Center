import { ZodError } from "zod";

import { getAppRepository } from "@/lib/app-repository";
import { requireCurrentUser } from "@/lib/auth";
import { jsonError, validationError } from "@/lib/http";

export async function GET() {
  const { user } = await requireCurrentUser();
  const repository = getAppRepository();
  return Response.json({ data: await repository.listOrganizationSummariesForUser(user) });
}

export async function POST(request: Request) {
  const { user } = await requireCurrentUser();
  const repository = getAppRepository();

  try {
    const body = (await request.json()) as unknown;
    const organization = await repository.createOrganization({
      user,
      name: readString(body, "name")
    });

    return Response.json({ data: organization }, { status: 201 });
  } catch (error) {
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
