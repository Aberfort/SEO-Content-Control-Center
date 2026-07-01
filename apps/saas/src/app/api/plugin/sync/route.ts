import { ZodError } from "zod";

import { jsonError, validationError } from "@/lib/http";
import { acceptPluginSyncBatch, authenticatePluginSyncRequest } from "@/lib/plugin-connection";

export async function POST(request: Request) {
  const bodyText = await request.text();

  try {
    const authentication = await authenticatePluginSyncRequest({
      request,
      bodyText
    });
    const data = await acceptPluginSyncBatch({
      authentication,
      body: JSON.parse(bodyText) as unknown
    });

    return Response.json({ data });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
    }

    if (error instanceof ZodError) {
      return validationError(error);
    }

    if (
      error instanceof Error &&
      [
        "PLUGIN_SIGNATURE_MISSING",
        "PLUGIN_SIGNATURE_INVALID",
        "PLUGIN_SIGNATURE_EXPIRED",
        "PLUGIN_TOKEN_INVALID",
        "PLUGIN_CONNECTION_NOT_FOUND"
      ].includes(error.message)
    ) {
      return jsonError(401, error.message, "Plugin request signature is invalid.");
    }

    if (error instanceof Error && error.message === "PLUGIN_SYNC_SCOPE_MISMATCH") {
      return jsonError(403, "PLUGIN_SYNC_SCOPE_MISMATCH", "Plugin sync scope does not match.");
    }

    return jsonError(400, "PLUGIN_SYNC_FAILED", "Could not accept plugin sync batch.");
  }
}
