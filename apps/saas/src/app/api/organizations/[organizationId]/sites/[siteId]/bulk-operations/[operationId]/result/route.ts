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
      action: "result"
    });
    const operation = await repository.finishBulkOperation({
      user,
      organizationId,
      siteId,
      operationId,
      status: readString(body, "status") as never,
      message: readNullableString(body, "message"),
      itemResults: Array.isArray(body.itemResults) ? (body.itemResults as never) : undefined
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
      return jsonError(
        409,
        "BULK_OPERATION_NOT_READY",
        "Bulk operation is not running and cannot accept execution results."
      );
    }

    if (error instanceof Error && error.message === "BULK_OPERATION_ITEM_NOT_FOUND") {
      return jsonError(
        422,
        "BULK_OPERATION_ITEM_NOT_FOUND",
        "One or more result items do not belong to this bulk operation."
      );
    }

    if (error instanceof Error && error.message === "BULK_OPERATION_ITEM_DUPLICATE") {
      return jsonError(
        422,
        "BULK_OPERATION_ITEM_DUPLICATE",
        "Bulk operation result items must be unique."
      );
    }

    if (error instanceof Error && error.message.startsWith("Role ")) {
      return jsonError(
        403,
        "FORBIDDEN",
        "Your role does not allow recording bulk operation results."
      );
    }

    return jsonError(404, "ORGANIZATION_NOT_FOUND", "Organization was not found.");
  }
}

function readString(input: Record<string, unknown>, key: string): string {
  const value = input[key];
  return typeof value === "string" ? value : "";
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
