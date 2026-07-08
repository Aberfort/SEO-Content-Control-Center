import { ZodError } from "zod";

import { jsonError, validationError } from "@/lib/http";
import {
  authenticatePluginSyncRequest,
  disconnectAuthenticatedPluginConnection
} from "@/lib/plugin-connection";

export async function POST(request: Request) {
  const bodyText = await request.text();

  try {
    const body = parseJsonBody(bodyText);
    const authentication = await authenticatePluginSyncRequest({
      request,
      bodyText
    });
    const data = await disconnectAuthenticatedPluginConnection({
      authentication,
      body
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
        "PLUGIN_CONNECTION_NOT_FOUND",
        "PLUGIN_TOKEN_INVALID"
      ].includes(error.message)
    ) {
      return jsonError(401, error.message, "Plugin request signature is invalid.");
    }

    if (error instanceof Error && error.message === "PLUGIN_DISCONNECT_SCOPE_MISMATCH") {
      return jsonError(
        403,
        "PLUGIN_DISCONNECT_SCOPE_MISMATCH",
        "Plugin disconnect scope does not match."
      );
    }

    if (error instanceof Error && error.message === "SITE_NOT_FOUND") {
      return jsonError(404, "SITE_NOT_FOUND", "Site was not found.");
    }

    return jsonError(400, "PLUGIN_DISCONNECT_FAILED", "Could not disconnect plugin connection.");
  }
}

function parseJsonBody(bodyText: string): unknown {
  return JSON.parse(bodyText || "{}") as unknown;
}
