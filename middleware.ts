import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n";

/**
 * Track B i18n middleware.
 *
 * Scope (B-12): public landing root + EN-prefixed variants + migrated public
 * pages (manifesto, pricing, features, blog). Does NOT match /app/**,
 * /api/**, /auth/**, /login, /onboarding, /reset-password, /risk-disclaimer.
 * Static files (anything containing a dot) and Next internals are excluded.
 */
export default createMiddleware(routing);

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
