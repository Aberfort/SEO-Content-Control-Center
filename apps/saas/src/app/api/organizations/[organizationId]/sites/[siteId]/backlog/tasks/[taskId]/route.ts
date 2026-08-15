import { ZodError } from "zod";

import { getAppRepository } from "@/lib/app-repository";
import { getCurrentUser } from "@/lib/auth";
import { assertRequestSameOrigin } from "@/lib/csrf";
import { jsonError, securityError, unauthorizedError, validationError } from "@/lib/http";

type RouteContext = {
  params: Promise<{
    organizationId: string;
    siteId: string;
    taskId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
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

  const { organizationId, siteId, taskId } = await context.params;
  const repository = getAppRepository();

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const task = hasOutcomeInput(body)
      ? await repository.updateBacklogTaskOutcome({
          user,
          organizationId,
          siteId,
          taskId,
          outcomeStatus: readNullableString(body, "outcomeStatus") as never,
          outcomeNote: readNullableString(body, "outcomeNote")
        })
      : hasAssignmentInput(body) && !readString(body, "status")
        ? await repository.updateBacklogTaskAssignment({
            user,
            organizationId,
            siteId,
            taskId,
            assigneeId: readNullableString(body, "assigneeId"),
            dueDate: readNullableString(body, "dueDate")
          })
        : await repository.updateBacklogTaskStatus({
            user,
            organizationId,
            siteId,
            taskId,
            status: readString(body, "status") as never
          });

    return Response.json({ data: task });
  } catch (error) {
    const response = securityError(error);

    if (response) {
      return response;
    }

    if (error instanceof ZodError) {
      return validationError(error);
    }

    if (error instanceof Error && error.message === "BACKLOG_TASK_NOT_FOUND") {
      return jsonError(404, "BACKLOG_TASK_NOT_FOUND", "Backlog task was not found.");
    }

    if (error instanceof Error && error.message === "BACKLOG_ASSIGNEE_NOT_FOUND") {
      return jsonError(404, "BACKLOG_ASSIGNEE_NOT_FOUND", "Backlog assignee was not found.");
    }

    if (error instanceof Error && error.message === "BACKLOG_TASK_OUTCOME_REQUIRES_DONE") {
      return jsonError(
        409,
        "BACKLOG_TASK_OUTCOME_NOT_READY",
        "Complete the task before verifying its outcome."
      );
    }

    if (error instanceof Error && error.message.startsWith("Role ")) {
      return jsonError(403, "FORBIDDEN", "Your role does not allow updating backlog tasks.");
    }

    return jsonError(404, "ORGANIZATION_NOT_FOUND", "Organization was not found.");
  }
}

function readString(input: Record<string, unknown>, key: string): string {
  const value = input[key];
  return typeof value === "string" ? value : "";
}

function readNullableString(input: Record<string, unknown>, key: string): string | null {
  const value = input[key];
  return typeof value === "string" && value ? value : null;
}

function hasAssignmentInput(input: Record<string, unknown>): boolean {
  return "assigneeId" in input || "dueDate" in input;
}

function hasOutcomeInput(input: Record<string, unknown>): boolean {
  return "outcomeStatus" in input || "outcomeNote" in input;
}
