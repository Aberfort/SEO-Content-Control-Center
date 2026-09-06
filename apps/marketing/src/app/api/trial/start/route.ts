import { NextResponse, type NextRequest } from "next/server";

import { captureMarketingEvent } from "../../../../lib/analytics";
import { appUrl } from "../../../../lib/site";
import { anonymousDistinctId, visitorIdCookieName } from "../../../../lib/visitor";

/**
 * Sits between the marketing `/trial` form and the SaaS registration page so
 * the `trial_started` funnel event can be captured server-side before the
 * visitor leaves the marketing origin. The SaaS app is a separate Vercel
 * project, so a plain cross-origin form submit would never reach marketing
 * code at all. Forwards only the fields the form actually sends and redirects
 * immediately — invisible to the visitor beyond one extra redirect hop.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const params = request.nextUrl.searchParams;
  const distinctId = request.cookies.get(visitorIdCookieName)?.value || anonymousDistinctId();

  await captureMarketingEvent({
    event: "trial_started",
    distinctId,
    properties: {
      plan: params.get("plan") || null,
      source: params.get("source") || null
    }
  });

  const target = new URL(appUrl("/auth/register"));

  for (const key of ["email", "plan", "source"]) {
    const value = params.get(key);
    if (value) {
      target.searchParams.set(key, value);
    }
  }

  return NextResponse.redirect(target, 302);
}
