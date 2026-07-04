import { getAppRepository } from "@/lib/app-repository";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, unauthorizedError } from "@/lib/http";

type RouteContext = {
  params: Promise<{
    organizationId: string;
    siteId: string;
    taskId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorizedError();
  }

  const { organizationId, siteId, taskId } = await context.params;
  const repository = getAppRepository();

  try {
    const activity = await repository.listBacklogTaskActivity(
      user.id,
      organizationId,
      siteId,
      taskId
    );
    return Response.json({ data: activity });
  } catch (error) {
    if (error instanceof Error && error.message === "BACKLOG_TASK_NOT_FOUND") {
      return jsonError(404, "BACKLOG_TASK_NOT_FOUND", "Backlog task was not found.");
    }

    if (error instanceof Error && error.message.startsWith("Role ")) {
      return jsonError(403, "FORBIDDEN", "Your role does not allow reading backlog activity.");
    }

    return jsonError(404, "ORGANIZATION_NOT_FOUND", "Organization was not found.");
  }
}
