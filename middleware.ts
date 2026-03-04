import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Mantido para futura integração com @supabase/ssr. Proteção de /app é feita no client (AuthGate).
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/app", "/app/:path*"],
};
