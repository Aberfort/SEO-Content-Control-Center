import { getLatestPluginRelease, getPluginDownloadUrl } from "@sccc/storage";

import { getPluginObjectStore } from "../../../../lib/plugin-release";

const staticFallbackPath = "/downloads/content-signal-seo-content-audit-0.8.1.zip";

export async function GET(request: Request) {
  const store = getPluginObjectStore();
  const manifest = store ? await getLatestPluginRelease(store) : null;

  if (!store || !manifest) {
    return Response.redirect(new URL(staticFallbackPath, request.url), 302);
  }

  const url = await getPluginDownloadUrl(store, manifest);

  return Response.redirect(url, 302);
}
