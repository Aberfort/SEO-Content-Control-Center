import { auditIssueListQuerySchema } from "@sccc/shared";
import { ZodError } from "zod";

import { getAppRepository } from "@/lib/app-repository";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, unauthorizedError, validationError } from "@/lib/http";
import type { AuditIssue } from "@/lib/types";

type RouteContext = {
  params: Promise<{
    organizationId: string;
    siteId: string;
    auditId: string;
  }>;
};

const csvHeaders = [
  "id",
  "auditId",
  "siteId",
  "status",
  "severity",
  "issueType",
  "affectedUrl",
  "recommendedAction",
  "explanation",
  "potentialImpact",
  "fingerprint",
  "createdAt",
  "updatedAt"
];

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
      limit: 500
    });
    const issues = await repository.listAuditIssuesForAudit(
      user.id,
      organizationId,
      siteId,
      auditId,
      query
    );
    const csv = buildAuditIssueCsv(issues);

    return new Response(csv, {
      headers: {
        "content-disposition": `attachment; filename="audit-issues-${siteId}-${auditId}.csv"`,
        "content-type": "text/csv; charset=utf-8"
      }
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(error);
    }

    if (error instanceof Error && error.message === "AUDIT_NOT_FOUND") {
      return jsonError(404, "AUDIT_NOT_FOUND", "Audit was not found.");
    }

    if (error instanceof Error && error.message.startsWith("Role ")) {
      return jsonError(403, "FORBIDDEN", "Your role does not allow exporting audit issues.");
    }

    return jsonError(404, "ORGANIZATION_NOT_FOUND", "Organization was not found.");
  }
}

function buildAuditIssueCsv(issues: AuditIssue[]): string {
  const rows = issues.map((issue) => [
    issue.id,
    issue.auditId,
    issue.siteId,
    issue.status,
    issue.severity,
    issue.issueType,
    issue.affectedUrl,
    issue.recommendedAction,
    issue.explanation,
    issue.potentialImpact ?? "",
    issue.fingerprint,
    issue.createdAt,
    issue.updatedAt
  ]);

  return [csvHeaders, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\n") + "\n";
}

function escapeCsvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function readSearchParam(request: Request, key: string): string {
  return new URL(request.url).searchParams.get(key) ?? "";
}
