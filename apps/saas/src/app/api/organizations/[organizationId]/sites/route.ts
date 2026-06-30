import { ZodError } from "zod";

import { requireCurrentUser } from "@/lib/auth";
import { createSite, listSitesForOrganization } from "@/lib/dev-store";
import { jsonError, validationError } from "@/lib/http";

type RouteContext = {
  params: Promise<{
    organizationId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { user } = await requireCurrentUser();
  const { organizationId } = await context.params;

  try {
    return Response.json({ data: listSitesForOrganization(user.id, organizationId) });
  } catch {
    return jsonError(404, "ORGANIZATION_NOT_FOUND", "Organization was not found.");
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { user } = await requireCurrentUser();
  const { organizationId } = await context.params;

  try {
    const body = (await request.json()) as unknown;
    const site = createSite({
      user,
      organizationId,
      name: readString(body, "name"),
      url: readString(body, "url")
    });

    return Response.json({ data: site }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(error);
    }

    if (error instanceof Error && error.message === "SITE_ALREADY_EXISTS") {
      return jsonError(409, "SITE_ALREADY_EXISTS", "This site already exists in the organization.");
    }

    if (error instanceof Error && error.message.startsWith("Role ")) {
      return jsonError(403, "FORBIDDEN", "Your role does not allow creating sites.");
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
