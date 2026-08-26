import { createHash } from "node:crypto";

import * as cheerio from "cheerio";

export type ExtractedSignals = {
  title: string | null;
  metaDescription: string | null;
  h1: string | null;
  canonical: string | null;
  metaRobots: string | null;
  hasStructuredData: boolean;
  hasGa4: boolean;
  hasGtm: boolean;
  contentHash: string;
  htmlHash: string;
};

const ga4Pattern = /googletagmanager\.com\/gtag\/js|gtag\(\s*['"]config['"]\s*,\s*['"]G-|\bG-[A-Z0-9]{6,}\b/;
const gtmPattern = /googletagmanager\.com\/gtm\.js|GTM-[A-Z0-9]{4,}/;

export function extractSignals(html: string): ExtractedSignals {
  const $ = cheerio.load(html);
  const scriptSrcs = $("script[src]")
    .map((_, element) => $(element).attr("src") ?? "")
    .get();
  const inlineScripts = $("script:not([src])")
    .map((_, element) => $(element).html() ?? "")
    .get()
    .join("\n");
  const scriptCorpus = `${scriptSrcs.join("\n")}\n${inlineScripts}`;
  const bodyText = normalizeText($("body").text()) ?? "";

  return {
    title: normalizeText($("title").first().text()),
    metaDescription: normalizeText($('meta[name="description"]').attr("content") ?? null),
    h1: normalizeText($("h1").first().text()),
    canonical: normalizeAttr($('link[rel="canonical"]').first().attr("href")),
    metaRobots: normalizeText($('meta[name="robots"]').attr("content") ?? null)?.toLowerCase() ?? null,
    hasStructuredData: $('script[type="application/ld+json"]').length > 0,
    hasGa4: ga4Pattern.test(scriptCorpus),
    hasGtm: gtmPattern.test(scriptCorpus) || gtmPattern.test(html),
    contentHash: createHash("sha256").update(bodyText).digest("hex"),
    htmlHash: createHash("sha256").update(html).digest("hex")
  };
}

function normalizeText(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeAttr(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
