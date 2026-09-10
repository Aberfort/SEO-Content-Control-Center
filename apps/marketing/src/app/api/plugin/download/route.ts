import { getLatestPluginRelease, getPluginDownloadUrl } from "@sccc/storage";
import type { NextRequest } from "next/server";

import { captureMarketingEvent } from "../../../../lib/analytics";
import { getPluginObjectStore } from "../../../../lib/plugin-release";
import { anonymousDistinctId, visitorIdCookieName } from "../../../../lib/visitor";

const staticFallbackPath = "/downloads/content-signal-seo-content-audit-0.9.4.zip";

export async function GET(request: NextRequest) {
  const store = getPluginObjectStore();
  const manifest = store ? await getLatestPluginRelease(store) : null;
  const version = manifest?.version ?? "0.9.4-static-fallback";

  await captureMarketingEvent({
    event: "plugin_downloaded",
    distinctId: request.cookies.get(visitorIdCookieName)?.value || anonymousDistinctId(),
    properties: { version }
  });

  if (!store || !manifest) {
    return Response.redirect(new URL(staticFallbackPath, request.url), 302);
  }

  const url = await getPluginDownloadUrl(store, manifest);

  return Response.redirect(url, 302);
}
