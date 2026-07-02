import { auditIssueListQuerySchema } from "@sccc/shared";
import { ZodError } from "zod";

import { getAppRepository } from "@/lib/app-repository";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, unauthorizedError, validationError } from "@/lib/http";

type RouteContext = {
  params: Promise<{
    organizationId: string;
    siteId: string;
    auditId: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorizedError();
  }

  const { organizationId, siteId, auditId } = await context.params;
  const repository = getAppRepository();

  try {
    const query = auditIssueListQuerySchema.parse({
      query: readSearchParam(request, "q") || undefined,
      status: readSearchParam(request, "status") || undefined,
      severity: readSearchParam(request, "severity") || undefined,
      limit: readSearchParam(request, "limit") || undefined
    });
    const issues = await repository.listAuditIssuesForAudit(
      user.id,
      organizationId,
      siteId,
      auditId,
      query
    );

    return Response.json({ data: issues });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(error);
    }

    if (error instanceof Error && error.message === "AUDIT_NOT_FOUND") {
      return jsonError(404, "AUDIT_NOT_FOUND", "Audit was not found.");
    }

    if (error instanceof Error && error.message.startsWith("Role ")) {
      return jsonError(403, "FORBIDDEN", "Your role does not allow reading audit issues.");
    }

    return jsonError(404, "ORGANIZATION_NOT_FOUND", "Organization was not found.");
  }
}

function readSearchParam(request: Request, key: string): string {
  return new URL(request.url).searchParams.get(key) ?? "";
}
