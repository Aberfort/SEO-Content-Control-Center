import { updateRegressionStatusSchema } from "@sccc/shared";
import { ZodError } from "zod";

import { getAppRepository } from "@/lib/app-repository";
import { getCurrentUser } from "@/lib/auth";
import { assertRequestSameOrigin } from "@/lib/csrf";
import { jsonError, securityError, unauthorizedError, validationError } from "@/lib/http";

type RouteContext = {
  params: Promise<{
    organizationId: string;
    siteId: string;
    regressionId: string;
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

  const { organizationId, siteId, regressionId } = await context.params;
  const repository = getAppRepository();

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const parsed = updateRegressionStatusSchema.parse({
      organizationId,
      siteId,
      regressionId,
      status: readString(body, "status")
    });
    const regression = await repository.updateRegressionStatus({
      user,
      ...parsed
    });

    return Response.json({ data: regression });
  } catch (error) {
    const response = securityError(error);

    if (response) {
      return response;
    }

    if (error instanceof ZodError) {
      return validationError(error);
    }

    if (error instanceof Error && error.message === "REGRESSION_NOT_FOUND") {
      return jsonError(404, "REGRESSION_NOT_FOUND", "Regression was not found.");
    }

    if (error instanceof Error && error.message.startsWith("Role ")) {
      return jsonError(403, "FORBIDDEN", "Your role does not allow updating regressions.");
    }

    return jsonError(404, "ORGANIZATION_NOT_FOUND", "Organization was not found.");
  }
}

function readString(input: Record<string, unknown>, key: string): string {
  const value = input[key];
  return typeof value === "string" ? value : "";
}
