import { describe, expect, it } from "vitest";

import { extractSignals } from "../src/extract";

function html(body: string): string {
  return `<!doctype html><html><head>${body}</head><body><h1>Fallback</h1></body></html>`;
}

describe("extractSignals", () => {
  it("extracts title, meta description, h1, canonical, and robots", () => {
    const page = `<!doctype html><html><head>
      <title>Best Online Casinos 2026</title>
      <meta name="description" content="A description.">
      <link rel="canonical" href="https://example.com/page/">
      <meta name="robots" content="index, follow">
    </head><body><h1>Best Online Casinos</h1></body></html>`;

    const signals = extractSignals(page);

    expect(signals.title).toBe("Best Online Casinos 2026");
    expect(signals.metaDescription).toBe("A description.");
    expect(signals.h1).toBe("Best Online Casinos");
    expect(signals.canonical).toBe("https://example.com/page/");
    expect(signals.metaRobots).toBe("index, follow");
  });

  it("detects structured data presence via JSON-LD", () => {
    const withSchema = html('<script type="application/ld+json">{"@type":"Article"}</script>');
    const withoutSchema = html("");

    expect(extractSignals(withSchema).hasStructuredData).toBe(true);
    expect(extractSignals(withoutSchema).hasStructuredData).toBe(false);
  });

  it("detects GA4 via gtag.js script src", () => {
    const withGa4 = html(
      '<script async src="https://www.googletagmanager.com/gtag/js?id=G-ABC1234"></script>'
    );

    expect(extractSignals(withGa4).hasGa4).toBe(true);
    expect(extractSignals(html("")).hasGa4).toBe(false);
  });

  it("detects GTM via container script", () => {
    const withGtm = html(
      '<script>(function(w,d,s,l,i){})(window,document,"script","dataLayer","GTM-ABCD12");</script>'
    );

    expect(extractSignals(withGtm).hasGtm).toBe(true);
    expect(extractSignals(html("")).hasGtm).toBe(false);
  });

  it("produces a stable content hash for identical body text and a different one for changed text", () => {
    const pageA = `<!doctype html><html><body><p>Hello world</p></body></html>`;
    const pageB = `<!doctype html><html><body><p>Hello world</p></body></html>`;
    const pageC = `<!doctype html><html><body><p>Something else entirely</p></body></html>`;

    expect(extractSignals(pageA).contentHash).toBe(extractSignals(pageB).contentHash);
    expect(extractSignals(pageA).contentHash).not.toBe(extractSignals(pageC).contentHash);
  });

  it("returns null fields when tags are absent", () => {
    const signals = extractSignals("<!doctype html><html><head></head><body></body></html>");

    expect(signals.title).toBeNull();
    expect(signals.metaDescription).toBeNull();
    expect(signals.h1).toBeNull();
    expect(signals.canonical).toBeNull();
    expect(signals.metaRobots).toBeNull();
  });
});
