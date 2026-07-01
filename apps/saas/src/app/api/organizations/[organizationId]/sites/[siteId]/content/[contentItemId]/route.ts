import { getAppRepository } from "@/lib/app-repository";
import { getCurrentUser } from "@/lib/auth";
import {
  buildSyncedContentBacklogCandidates,
  buildSyncedContentHealthSignals
} from "@/lib/content-health";
import { jsonError, unauthorizedError } from "@/lib/http";

type RouteContext = {
  params: Promise<{
    organizationId: string;
    siteId: string;
    contentItemId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorizedError();
  }

  const { organizationId, siteId, contentItemId } = await context.params;
  const repository = getAppRepository();

  try {
    const item = await repository.getSyncedContentItem(
      user.id,
      organizationId,
      siteId,
      contentItemId
    );

    if (!item) {
      return jsonError(404, "CONTENT_ITEM_NOT_FOUND", "Synced content item was not found.");
    }

    const healthSignals = buildSyncedContentHealthSignals(item);

    return Response.json({
      data: {
        ...item,
        healthSignals,
        backlogCandidates: buildSyncedContentBacklogCandidates(item, healthSignals)
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Role ")) {
      return jsonError(403, "FORBIDDEN", "Your role does not allow reading site content.");
    }

    return jsonError(404, "ORGANIZATION_NOT_FOUND", "Organization was not found.");
  }
}
