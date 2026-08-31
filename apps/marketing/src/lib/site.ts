import type { Metadata } from "next";

export const siteName = "Content Signal";

/**
 * The public origin the brand actually ranks on. Metadata, `robots.txt`, and
 * `sitemap.xml` must never advertise a deployment-generated hostname: a
 * canonical pointing at `*.vercel.app` tells Google the custom domain is a
 * duplicate and removes it from the index.
 */
export const canonicalMarketingOrigin = "https://getcontentsignal.com";

export const marketingOrigin = readCanonicalUrl(
  process.env.NEXT_PUBLIC_MARKETING_URL,
  "http://localhost:3001"
);

export const appOrigin = readPublicUrl(process.env.NEXT_PUBLIC_APP_URL, "http://localhost:3000");

export function appUrl(path: string): string {
  return new URL(path, `${appOrigin}/`).toString();
}

export function pageMetadata(input: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  return {
    title: input.title,
    description: input.description,
    alternates: {
      canonical: input.path
    },
    openGraph: {
      type: "website",
      title: input.title,
      description: input.description,
      url: input.path,
      siteName
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description
    }
  };
}

/**
 * True for hostnames Vercel generates per deployment. These resolve publicly and
 * are crawlable, so they must never be used as a canonical or sitemap origin.
 */
export function isDeploymentHostname(hostname: string): boolean {
  return hostname === "vercel.app" || hostname.endsWith(".vercel.app");
}

function readCanonicalUrl(value: string | undefined, fallback: string): string {
  const origin = readPublicUrl(value, fallback);

  try {
    if (isDeploymentHostname(new URL(origin).hostname)) {
      return canonicalMarketingOrigin;
    }
  } catch {
    return canonicalMarketingOrigin;
  }

  return origin;
}

function readPublicUrl(value: string | undefined, fallback: string): string {
  const candidate = value?.trim() || fallback;

  try {
    return new URL(candidate).origin;
  } catch {
    return fallback;
  }
}
