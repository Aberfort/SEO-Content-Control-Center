import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { canonicalMarketingOrigin, isDeploymentHostname } from "./lib/site";
import { visitorIdCookieName } from "./lib/visitor";

const visitorIdCookieMaxAgeSeconds = 60 * 60 * 24 * 365;

/** Paths in the shared `landing_view` / `pricing_view` funnel taxonomy. */
const pageviewEventByPath: Record<string, "landing_view" | "pricing_view"> = {
  "/": "landing_view",
  "/pricing": "pricing_view"
};

const defaultPosthogHost = "https://us.i.posthog.com";

/**
 * Minimal, self-contained PostHog capture for Edge Middleware. Deliberately
 * does not import `../lib/analytics` — that module pulls in `@sccc/shared`'s
 * barrel export, which includes `plugin-signing.ts`'s `node:crypto` import
 * and cannot be bundled for the Edge runtime. Payload shape matches the
 * shared Node.js client exactly so events look identical in PostHog
 * regardless of which one sent them.
 */
async function captureEdgePageview(input: {
  event: "landing_view" | "pricing_view";
  distinctId: string;
  properties: Record<string, string | null>;
}): Promise<void> {
  const apiKey = process.env.POSTHOG_KEY?.trim();

  if (!apiKey) {
    return;
  }

  const host = (process.env.POSTHOG_HOST?.trim() || defaultPosthogHost).replace(/\/+$/, "");

  try {
    const response = await fetch(`${host}/capture/`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        event: input.event,
        distinct_id: input.distinctId,
        timestamp: new Date().toISOString(),
        properties: { ...input.properties, source: "server" }
      })
    });

    if (!response.ok) {
      console.error("Marketing analytics capture failed", {
        error: `PostHog capture rejected with HTTP ${response.status}`
      });
    }
  } catch (error) {
    console.error("Marketing analytics capture failed", {
      error: error instanceof Error ? error.message : "Unknown analytics error"
    });
  }
}

/**
 * Coarse bot filter for pageview capture. Not exhaustive — the goal is just
 * to keep obvious crawlers and uptime checks out of funnel counts, not to
 * build a bot-detection system.
 */
const botUserAgentPattern =
  /bot|crawler|spider|slurp|facebookexternalhit|pingdom|uptimerobot|ahrefsbot|semrushbot|mj12bot|dataforseo/i;

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const response = deploymentHostnameRedirect(request) ?? NextResponse.next();

  const existingVisitorId = request.cookies.get(visitorIdCookieName)?.value;
  const visitorId = existingVisitorId || crypto.randomUUID();

  if (!existingVisitorId) {
    response.cookies.set(visitorIdCookieName, visitorId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.VERCEL_ENV === "production",
      path: "/",
      maxAge: visitorIdCookieMaxAgeSeconds
    });
  }

  await capturePageview(request, visitorId);

  return response;
}

/**
 * Vercel serves every production deployment on its generated `*.vercel.app`
 * hostname as well as on the custom domain. Both are crawlable, so search
 * engines see two complete copies of the marketing site. Redirect the
 * deployment hostname to the canonical domain so ranking signals consolidate on
 * one origin. Preview deployments are left alone: they are meant to be reached
 * on their own hostname.
 */
function deploymentHostnameRedirect(request: NextRequest): NextResponse | null {
  if (process.env.VERCEL_ENV !== "production") {
    return null;
  }

  const host = request.headers.get("host");

  if (!host || !isDeploymentHostname(host.split(":")[0]!)) {
    return null;
  }

  const target = new URL(request.nextUrl.pathname + request.nextUrl.search, canonicalMarketingOrigin);

  return NextResponse.redirect(target, 308);
}

async function capturePageview(request: NextRequest, visitorId: string): Promise<void> {
  const event = pageviewEventByPath[request.nextUrl.pathname];

  if (!event || request.method !== "GET") {
    return;
  }

  // Prefetched links (Next.js `<Link>` hover/viewport prefetch) aren't a real
  // visit and would otherwise inflate funnel counts.
  if (request.headers.get("next-router-prefetch") || request.headers.get("purpose") === "prefetch") {
    return;
  }

  const userAgent = request.headers.get("user-agent") ?? "";

  if (botUserAgentPattern.test(userAgent)) {
    return;
  }

  await captureEdgePageview({
    event,
    distinctId: visitorId,
    properties: {
      path: request.nextUrl.pathname,
      referrer: request.headers.get("referer") || null
    }
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
