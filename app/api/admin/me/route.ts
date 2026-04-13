import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClientForUser } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";

/**
 * GET /api/admin/me
 * Returns whether the authenticated user is an admin.
 * Used by the frontend to decide whether to show admin nav link.
 */
export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Não autorizado" },
        { status: 401 }
      );
    }

    const supabase = createSupabaseClientForUser(token);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Token inválido" },
        { status: 401 }
      );
    }

    const admin = await isAdmin(supabase, user.id);

    return NextResponse.json({ ok: true, isAdmin: admin });
  } catch (err) {
    console.error("[admin/me] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Erro interno" },
      { status: 500 }
    );
  }
}
