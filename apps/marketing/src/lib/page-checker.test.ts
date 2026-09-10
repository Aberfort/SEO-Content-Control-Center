import type { ExtractedSignals } from "@sccc/monitoring";
import { describe, expect, it } from "vitest";

import { approximateWordCount, evaluateFindings, parseCheckerUrl } from "./page-checker";

const healthySignals: ExtractedSignals = {
  title: "A well-sized page title for search results",
  metaDescription:
    "A meta description that sits comfortably inside the range search engines display without truncating it in results.",
  h1: "A clear H1",
  canonical: "https://example.com/page",
  metaRobots: "index, follow",
  hasStructuredData: true,
  hasGa4: false,
  hasGtm: false,
  contentHash: "hash",
  htmlHash: "hash"
};

describe("parseCheckerUrl", () => {
  it("accepts a bare domain and adds https", () => {
    const result = parseCheckerUrl("example.com/post");
    expect(result).toEqual({ success: true, url: "https://example.com/post" });
  });

  it("rejects an empty value", () => {
    expect(parseCheckerUrl("")).toEqual({ success: false, error: expect.any(String) });
  });

  it("rejects a non-http protocol", () => {
    const result = parseCheckerUrl("ftp://example.com/file");
    expect(result.success).toBe(false);
  });

  it("rejects a hostname with no dot, like localhost", () => {
    const result = parseCheckerUrl("http://localhost:9000/secrets");
    expect(result.success).toBe(false);
  });
});

describe("evaluateFindings", () => {
  it("reports good findings for a healthy page", () => {
    const findings = evaluateFindings({
      httpStatus: 200,
      signals: healthySignals,
      approxWordCount: 900,
      xRobotsTag: null
    });

    expect(findings.find((f) => f.id === "noindex")?.severity).toBe("good");
    expect(findings.find((f) => f.id === "title")?.severity).toBe("good");
    expect(findings.find((f) => f.id === "meta-description")?.severity).toBe("good");
    expect(findings.find((f) => f.id === "x-robots-tag")).toBeUndefined();
  });

  it("flags a meta-robots noindex as critical", () => {
    const findings = evaluateFindings({
      httpStatus: 200,
      signals: { ...healthySignals, metaRobots: "noindex, follow" },
      approxWordCount: 900,
      xRobotsTag: null
    });

    expect(findings.find((f) => f.id === "noindex")?.severity).toBe("critical");
  });

  it("flags an X-Robots-Tag header noindex separately from meta robots", () => {
    const findings = evaluateFindings({
      httpStatus: 200,
      signals: healthySignals,
      approxWordCount: 900,
      xRobotsTag: "noindex"
    });

    expect(findings.find((f) => f.id === "noindex")?.severity).toBe("good");
    expect(findings.find((f) => f.id === "x-robots-tag")?.severity).toBe("critical");
  });

  it("flags a missing title and an over-length title differently", () => {
    const missing = evaluateFindings({
      httpStatus: 200,
      signals: { ...healthySignals, title: null },
      approxWordCount: 900,
      xRobotsTag: null
    });
    expect(missing.find((f) => f.id === "title")?.severity).toBe("critical");

    const tooLong = evaluateFindings({
      httpStatus: 200,
      signals: { ...healthySignals, title: "A".repeat(80) },
      approxWordCount: 900,
      xRobotsTag: null
    });
    expect(tooLong.find((f) => f.id === "title")?.severity).toBe("warning");
  });

  it("flags thin content under the word-count floor", () => {
    const findings = evaluateFindings({
      httpStatus: 200,
      signals: healthySignals,
      approxWordCount: 120,
      xRobotsTag: null
    });

    expect(findings.find((f) => f.id === "thin-content")?.severity).toBe("warning");
  });

  it("does not flag thin content once past the floor", () => {
    const findings = evaluateFindings({
      httpStatus: 200,
      signals: healthySignals,
      approxWordCount: 400,
      xRobotsTag: null
    });

    expect(findings.find((f) => f.id === "thin-content")).toBeUndefined();
  });

  it("flags a non-2xx response as critical", () => {
    const findings = evaluateFindings({
      httpStatus: 404,
      signals: healthySignals,
      approxWordCount: 900,
      xRobotsTag: null
    });

    expect(findings.find((f) => f.id === "http-status")?.severity).toBe("critical");
  });
});

describe("approximateWordCount", () => {
  it("strips tags, scripts, and entities before counting words", () => {
    const html =
      "<html><head><script>var x = 1;</script></head><body><p>One two&nbsp;three</p></body></html>";

    expect(approximateWordCount(html)).toBe(3);
  });
});
