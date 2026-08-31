import type { MetadataRoute } from "next";

import { briefings } from "../lib/briefings";
import { marketingOrigin } from "../lib/site";

type RouteEntry = {
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  lastModified: string;
};

const routes: RouteEntry[] = [
  { path: "", priority: 1, changeFrequency: "weekly", lastModified: "2026-08-31" },
  { path: "/features", priority: 0.9, changeFrequency: "monthly", lastModified: "2026-08-31" },
  { path: "/pricing", priority: 0.9, changeFrequency: "monthly", lastModified: "2026-08-31" },
  { path: "/download", priority: 0.9, changeFrequency: "monthly", lastModified: "2026-08-31" },
  { path: "/product", priority: 0.8, changeFrequency: "monthly", lastModified: "2026-08-31" },
  { path: "/integrations", priority: 0.8, changeFrequency: "monthly", lastModified: "2026-08-31" },
  {
    path: "/solutions/agencies",
    priority: 0.8,
    changeFrequency: "monthly",
    lastModified: "2026-08-31"
  },
  {
    path: "/solutions/content-teams",
    priority: 0.8,
    changeFrequency: "monthly",
    lastModified: "2026-08-31"
  },
  {
    path: "/solutions/publishers",
    priority: 0.8,
    changeFrequency: "monthly",
    lastModified: "2026-08-31"
  },
  { path: "/blog", priority: 0.7, changeFrequency: "weekly", lastModified: "2026-08-31" },
  { path: "/knowledge-base", priority: 0.7, changeFrequency: "monthly", lastModified: "2026-08-31" },
  { path: "/security", priority: 0.6, changeFrequency: "monthly", lastModified: "2026-07-10" },
  { path: "/changelog", priority: 0.6, changeFrequency: "weekly", lastModified: "2026-08-31" },
  { path: "/contact", priority: 0.5, changeFrequency: "yearly", lastModified: "2026-07-10" },
  { path: "/status", priority: 0.4, changeFrequency: "monthly", lastModified: "2026-07-10" },
  { path: "/demo", priority: 0.6, changeFrequency: "yearly", lastModified: "2026-07-10" },
  { path: "/trial", priority: 0.6, changeFrequency: "yearly", lastModified: "2026-07-10" },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly", lastModified: "2026-07-10" },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly", lastModified: "2026-07-10" },
  { path: "/cookies", priority: 0.3, changeFrequency: "yearly", lastModified: "2026-07-10" }
];

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = routes.map((route) => ({
    url: `${marketingOrigin}${route.path}`,
    lastModified: new Date(route.lastModified),
    changeFrequency: route.changeFrequency,
    priority: route.priority
  }));

  const articles: MetadataRoute.Sitemap = briefings.map((briefing) => ({
    url: `${marketingOrigin}/blog/${briefing.slug}`,
    lastModified: new Date(briefing.updated),
    changeFrequency: "yearly",
    priority: 0.6
  }));

  return [...pages, ...articles];
}
