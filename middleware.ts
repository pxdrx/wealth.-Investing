import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing, locales } from "./i18n";
import { isLandingRoute } from "./lib/i18n/landing-routes";

/**
 * i18n middleware (Track B).
 *
 * Scope: public landing only — the `/app/**` surface and auth flows rely on
 * cookie-based locale resolution in their own layouts.
 *
 * Behavior:
 *   - localeDetection=false: Accept-Language is ignored. PT is always default
 *     unless the user explicitly chose EN (cookie). Fixes shared-link bug
 *     where EN-browser visitors landed on /en without asking.
 *   - Cookie-based redirect: when cookie=en and the URL has no locale prefix,
 *     redirect to /en[pathname]. Keeps returning EN users anchored to /en.
 */
const intlMiddleware = createMiddleware({
  ...routing,
  localeDetection: false,
  localePrefix: "as-needed",
});

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Defensive: config.matcher already filters, guard anyway.
  if (!isLandingRoute(pathname)) {
    return NextResponse.next();
  }

  const cookieLocale = req.cookies.get("NEXT_LOCALE")?.value;
  const hasLocalePrefix = locales.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`),
  );

  if (!hasLocalePrefix && cookieLocale === "en") {
    const url = req.nextUrl.clone();
    url.pathname = pathname === "/" ? "/en" : `/en${pathname}`;
    return NextResponse.redirect(url);
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: [
    "/",
    "/(en)",
    "/(en)/:path*",
    "/manifesto",
    "/pricing",
    "/features",
    "/features/:path*",
    "/blog",
    "/blog/:path*",
  ],
};
