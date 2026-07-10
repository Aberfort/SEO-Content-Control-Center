import type { MetadataRoute } from "next";

import { marketingOrigin } from "../lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/"
    },
    sitemap: `${marketingOrigin}/sitemap.xml`
  };
}
