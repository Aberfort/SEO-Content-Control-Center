import { ZodError } from "zod";

import { getAppRepository } from "@/lib/app-repository";
import { getCurrentUser } from "@/lib/auth";
import { assertRequestSameOrigin } from "@/lib/csrf";
import { jsonError, securityError, unauthorizedError, validationError } from "@/lib/http";

type RouteContext = {
  params: Promise<{
    organizationId: string;
    siteId: string;
    operationId: string;
  }>;
};

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

  const { organizationId, siteId, operationId } = await context.params;
  const repository = getAppRepository();

  try {
    const operation = await repository.runBulkOperationDryRun({
      user,
      organizationId,
      siteId,
      operationId
    });

    return Response.json({ data: operation });
  } catch (error) {
    const response = securityError(error);

    if (response) {
      return response;
    }

    if (error instanceof ZodError) {
      return validationError(error);
    }

    if (error instanceof Error && error.message === "BULK_OPERATION_NOT_FOUND") {
      return jsonError(404, "BULK_OPERATION_NOT_FOUND", "Bulk operation was not found.");
    }

    if (error instanceof Error && error.message === "BULK_OPERATION_NOT_READY") {
      return jsonError(409, "BULK_OPERATION_NOT_READY", "Bulk operation is not ready for dry run.");
    }

    if (error instanceof Error && error.message.startsWith("Role ")) {
      return jsonError(403, "FORBIDDEN", "Your role does not allow dry running bulk operations.");
    }

    return jsonError(404, "ORGANIZATION_NOT_FOUND", "Organization was not found.");
  }
}
