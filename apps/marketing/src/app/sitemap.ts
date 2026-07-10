import type { MetadataRoute } from "next";

import { marketingOrigin } from "../lib/site";

const routes = [
  "",
  "/features",
  "/pricing",
  "/security",
  "/demo",
  "/trial",
  "/privacy",
  "/terms",
  "/cookies"
];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((path) => ({
    url: `${marketingOrigin}${path}`,
    lastModified: new Date("2026-07-10T00:00:00.000Z"),
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path === "/features" || path === "/pricing" ? 0.8 : 0.6
  }));
}
