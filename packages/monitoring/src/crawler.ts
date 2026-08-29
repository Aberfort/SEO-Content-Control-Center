import { assertPublicUrl } from "./ssrf-guard";

export type CrawlResult = {
  finalUrl: string;
  httpStatus: number;
  responseTimeMs: number;
  xRobotsTag: string | null;
  html: string;
};

export type CrawlOptions = {
  maxRedirects?: number;
  timeoutMs?: number;
  maxBytes?: number;
  userAgent?: string;
};

const defaultUserAgent = "ContentSignalBot/1.0 (+https://contentsignal.app/bot)";

/**
 * Fetches a monitored URL for snapshotting. Every hop (including redirects)
 * is re-validated against the SSRF guard so a page cannot redirect the
 * crawler into internal infrastructure.
 */
export async function crawlUrl(rawUrl: string, options: CrawlOptions = {}): Promise<CrawlResult> {
  const maxRedirects = options.maxRedirects ?? 5;
  const timeoutMs = options.timeoutMs ?? 15000;
  const maxBytes = options.maxBytes ?? 5_000_000;
  const userAgent = options.userAgent ?? defaultUserAgent;

  let currentUrl = rawUrl;
  const start = Date.now();

  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    const url = await assertPublicUrl(currentUrl);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;

    try {
      response = await fetch(url, {
        redirect: "manual",
        signal: controller.signal,
        headers: { "User-Agent": userAgent }
      });
    } finally {
      clearTimeout(timeout);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");

      if (!location) {
        return finalize(response, url.toString(), start, "");
      }

      currentUrl = new URL(location, url).toString();
      continue;
    }

    const html = await readBoundedText(response, maxBytes);
    return finalize(response, url.toString(), start, html);
  }

  throw new Error("CRAWL_TOO_MANY_REDIRECTS");
}

function finalize(response: Response, finalUrl: string, start: number, html: string): CrawlResult {
  return {
    finalUrl,
    httpStatus: response.status,
    responseTimeMs: Date.now() - start,
    xRobotsTag: response.headers.get("x-robots-tag"),
    html
  };
}

async function readBoundedText(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) {
    return response.text();
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  for (;;) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    if (value) {
      received += value.byteLength;
      chunks.push(value);

      if (received >= maxBytes) {
        await reader.cancel().catch(() => undefined);
        break;
      }
    }
  }

  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), Math.min(received, maxBytes)).toString(
    "utf-8"
  );
}
