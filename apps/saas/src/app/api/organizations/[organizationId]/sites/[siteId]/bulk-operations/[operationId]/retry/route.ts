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
    const body = (await request.json()) as Record<string, unknown>;
    await assertBulkOperationRateLimit({
      request,
      userId: user.id,
      organizationId,
      siteId,
      operationId,
      action: "retry"
    });
    const operation = await repository.retryBulkOperation({
      user,
      organizationId,
      siteId,
      operationId,
      reason: readNullableString(body, "reason")
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

    if (
      error instanceof Error &&
      (error.message === "BULK_OPERATION_NOT_READY" ||
        error.message === "BULK_OPERATION_RETRY_NOT_AVAILABLE")
    ) {
      return jsonError(
        409,
        "BULK_OPERATION_NOT_READY",
        "Bulk operation is not failed or has no failed items to retry."
      );
    }

    if (error instanceof Error && error.message.startsWith("Role ")) {
      return jsonError(403, "FORBIDDEN", "Your role does not allow retrying bulk operations.");
    }

    return jsonError(404, "ORGANIZATION_NOT_FOUND", "Organization was not found.");
  }
}

function readNullableString(
  input: Record<string, unknown>,
  key: string
): string | null | undefined {
  if (!(key in input)) {
    return undefined;
  }

  const value = input[key];

  if (value === null) {
    return null;
  }

  return typeof value === "string" ? value : "";
}
