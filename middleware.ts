import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * SEC-028: Defense-in-depth middleware for /app/** routes.
 *
 * TEMPORARILY DISABLED: Supabase auth cookies may not be available at the
 * middleware level on custom domains. AuthGate handles auth client-side.
 * TODO: Re-enable with @supabase/ssr for proper server-side cookie handling.
 */
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"],
};
