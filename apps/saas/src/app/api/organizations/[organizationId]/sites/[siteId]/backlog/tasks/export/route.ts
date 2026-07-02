import { backlogTaskListQuerySchema } from "@sccc/shared";
import { ZodError } from "zod";

import { getAppRepository } from "@/lib/app-repository";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, unauthorizedError, validationError } from "@/lib/http";
import type { BacklogTask } from "@/lib/types";

type RouteContext = {
  params: Promise<{
    organizationId: string;
    siteId: string;
  }>;
};

const csvHeaders = [
  "id",
  "title",
  "url",
  "issueType",
  "status",
  "severity",
  "effortEstimate",
  "assigneeId",
  "dueDate",
  "tags",
  "latestComment",
  "createdAt",
  "updatedAt"
];

export async function GET(request: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorizedError();
  }

  const { organizationId, siteId } = await context.params;
  const repository = getAppRepository();

  try {
    const query = backlogTaskListQuerySchema.parse({
      query: readSearchParam(request, "q") || undefined,
      status: readSearchParam(request, "status") || undefined,
      severity: readSearchParam(request, "severity") || undefined,
      limit: 500
    });
    const tasks = await repository.listBacklogTasksForSite(user.id, organizationId, siteId, query);
    const csv = buildBacklogCsv(tasks.items);

    return new Response(csv, {
      headers: {
        "content-disposition": `attachment; filename="backlog-${siteId}.csv"`,
        "content-type": "text/csv; charset=utf-8"
      }
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(error);
    }

    if (error instanceof Error && error.message === "SITE_NOT_FOUND") {
      return jsonError(404, "SITE_NOT_FOUND", "Site was not found.");
    }

    if (error instanceof Error && error.message.startsWith("Role ")) {
      return jsonError(403, "FORBIDDEN", "Your role does not allow exporting backlog tasks.");
    }

    return jsonError(404, "ORGANIZATION_NOT_FOUND", "Organization was not found.");
  }
}

function buildBacklogCsv(tasks: BacklogTask[]): string {
  const rows = tasks.map((task) => [
    task.id,
    task.title,
    task.url,
    task.issueType,
    task.status,
    task.severity,
    task.effortEstimate?.toString() ?? "",
    task.assigneeId ?? "",
    task.dueDate ?? "",
    task.tags.join(";"),
    task.comments[0]?.body ?? "",
    task.createdAt,
    task.updatedAt
  ]);

  return [csvHeaders, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\n") + "\n";
}

function escapeCsvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function readSearchParam(request: Request, key: string): string {
  return new URL(request.url).searchParams.get(key) ?? "";
}
