import type { MetadataRoute } from "next";

import { marketingOrigin } from "../lib/site";

const routes = [
  "",
  "/features",
  "/product",
  "/integrations",
  "/solutions/agencies",
  "/solutions/content-teams",
  "/solutions/publishers",
  "/pricing",
  "/security",
  "/knowledge-base",
  "/blog",
  "/changelog",
  "/contact",
  "/status",
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
