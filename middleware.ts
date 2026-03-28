import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * SEC-028: Defense-in-depth middleware for /app/** routes.
 * Performs a lightweight cookie-presence check for Supabase auth.
 * This is a SOFT check — AuthGate still does the real session validation client-side.
 * Prevents unauthenticated users from seeing even the shell of protected pages.
 */
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/app")) {
    const hasAuthCookie = request.cookies.getAll().some(
      (cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("-auth-token")
    );

    if (!hasAuthCookie) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"],
};
