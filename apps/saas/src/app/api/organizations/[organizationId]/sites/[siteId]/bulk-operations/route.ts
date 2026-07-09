import { bulkOperationListQuerySchema } from "@sccc/shared";
import { ZodError } from "zod";

import { getAppRepository } from "@/lib/app-repository";
import { getCurrentUser } from "@/lib/auth";
import { assertBulkOperationRateLimit } from "@/lib/bulk-operation-rate-limit";
import { assertRequestSameOrigin } from "@/lib/csrf";
import { jsonError, securityError, unauthorizedError, validationError } from "@/lib/http";

type RouteContext = {
  params: Promise<{
    organizationId: string;
    siteId: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorizedError();
  }

  const { organizationId, siteId } = await context.params;
  const repository = getAppRepository();

  try {
    const query = bulkOperationListQuerySchema.parse({
      status: readSearchParam(request, "status") || undefined,
      limit: readSearchParam(request, "limit") || undefined
    });
    const operations = await repository.listBulkOperationsForSite(
      user.id,
      organizationId,
      siteId,
      query
    );

    return Response.json({ data: operations });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(error);
    }

    if (error instanceof Error && error.message === "SITE_NOT_FOUND") {
      return jsonError(404, "SITE_NOT_FOUND", "Site was not found.");
    }

    if (error instanceof Error && error.message.startsWith("Role ")) {
      return jsonError(403, "FORBIDDEN", "Your role does not allow reading bulk operations.");
    }

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

  const { organizationId, siteId } = await context.params;
  const repository = getAppRepository();

  try {
    const body = (await request.json()) as Record<string, unknown>;
    await assertBulkOperationRateLimit({
      request,
      userId: user.id,
      organizationId,
      siteId,
      action: "preview"
    });
    const operation = await repository.createBulkOperationPreview({
      user,
      organizationId,
      siteId,
      taskId: readString(body, "taskId")
    });

    return Response.json({ data: operation }, { status: 201 });
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

    if (error instanceof Error && error.message.startsWith("Role ")) {
      return jsonError(403, "FORBIDDEN", "Your role does not allow previewing bulk operations.");
    }

    return jsonError(404, "ORGANIZATION_NOT_FOUND", "Organization was not found.");
  }
}

function readSearchParam(request: Request, key: string): string {
  return new URL(request.url).searchParams.get(key) ?? "";
}

function readString(input: Record<string, unknown>, key: string): string {
  const value = input[key];
  return typeof value === "string" ? value : "";
}
