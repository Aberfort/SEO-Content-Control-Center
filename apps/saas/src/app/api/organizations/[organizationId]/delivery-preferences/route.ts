import { deliveryPreferenceUpdateSchema } from "@sccc/shared";
import { ZodError } from "zod";

import { getAppRepository } from "@/lib/app-repository";
import { getCurrentUser } from "@/lib/auth";
import { assertRequestSameOrigin } from "@/lib/csrf";
import { jsonError, securityError, unauthorizedError, validationError } from "@/lib/http";

type RouteContext = { params: Promise<{ organizationId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) return unauthorizedError();

  const { organizationId } = await context.params;

  try {
    return Response.json({
      data: await getAppRepository().getDeliveryPreference(user.id, organizationId)
    });
  } catch {
    return jsonError(404, "ORGANIZATION_NOT_FOUND", "Organization was not found.");
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    assertRequestSameOrigin(request);
  } catch (error) {
    return securityError(error) ?? jsonError(403, "FORBIDDEN", "Request was rejected.");
  }

  const user = await getCurrentUser();

  if (!user) return unauthorizedError();

  const { organizationId } = await context.params;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const parsed = deliveryPreferenceUpdateSchema.parse({ ...body, organizationId });
    return Response.json({
      data: await getAppRepository().updateDeliveryPreference({ user, ...parsed })
    });
  } catch (error) {
    if (error instanceof ZodError) return validationError(error);
    return jsonError(404, "ORGANIZATION_NOT_FOUND", "Organization was not found.");
  }
}
