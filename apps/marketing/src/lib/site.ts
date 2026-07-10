import type { Metadata } from "next";

export const siteName = "SEO Content Control Center";

export const marketingOrigin = readPublicUrl(
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

function readPublicUrl(value: string | undefined, fallback: string): string {
  const candidate = value?.trim() || fallback;

  try {
    return new URL(candidate).origin;
  } catch {
    return fallback;
  }
}
