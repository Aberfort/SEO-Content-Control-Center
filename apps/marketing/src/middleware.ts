import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { canonicalMarketingOrigin, isDeploymentHostname } from "./lib/site";

/**
 * Vercel serves every production deployment on its generated `*.vercel.app`
 * hostname as well as on the custom domain. Both are crawlable, so search
 * engines see two complete copies of the marketing site. Redirect the
 * deployment hostname to the canonical domain so ranking signals consolidate on
 * one origin. Preview deployments are left alone: they are meant to be reached
 * on their own hostname.
 */
export function middleware(request: NextRequest): NextResponse {
  if (process.env.VERCEL_ENV !== "production") {
    return NextResponse.next();
  }

  const host = request.headers.get("host");

  if (!host || !isDeploymentHostname(host.split(":")[0]!)) {
    return NextResponse.next();
  }

  const target = new URL(request.nextUrl.pathname + request.nextUrl.search, canonicalMarketingOrigin);

  return NextResponse.redirect(target, 308);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
