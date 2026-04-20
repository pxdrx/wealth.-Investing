import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n";

/**
 * Track B i18n middleware.
 *
 * Scope: only the public landing root and the EN-prefixed equivalents.
 * Does NOT match /app/**, /api/**, /auth/**, /login, /onboarding, /pricing,
 * /manifesto, /features, /blog, /changelog, /academy, or /risk-disclaimer
 * during B-01. Those routes migrate into [locale] in B-12, at which point
 * the matcher will be widened.
 *
 * Static files (anything containing a dot) and Next internals are excluded.
 */
export default createMiddleware(routing);

export const config = {
  matcher: ["/", "/(en)", "/(en)/:path*"],
};
