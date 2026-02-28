import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protege apenas rotas que começam com /app
  if (pathname.startsWith("/app")) {
    const authCookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (authCookie !== "true") {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

// Só executa para /app e /app/* — /login e assets (_next, static, favicon) não passam pelo middleware
export const config = {
  matcher: ["/app", "/app/:path*"],
};
