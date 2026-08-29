import { jsonError, securityError } from "@/lib/http";
import { authenticatePluginSyncRequest, getPluginMonitoringSummary } from "@/lib/plugin-connection";
import { assertRateLimit, rateLimitKeyFromHeaders } from "@/lib/rate-limit";

export async function GET(request: Request) {
  try {
    await assertRateLimit("plugin-monitoring-read", rateLimitKeyFromHeaders(request.headers));
    const authentication = await authenticatePluginSyncRequest({
      request,
      bodyText: ""
    });
    const data = await getPluginMonitoringSummary(authentication);

    return Response.json({ data });
  } catch (error) {
    const response = securityError(error);

    if (response) {
      return response;
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

    return jsonError(400, "PLUGIN_MONITORING_SUMMARY_FAILED", "Could not load monitoring summary.");
  }
}
