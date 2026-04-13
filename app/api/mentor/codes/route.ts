import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClientForUser } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createSupabaseClientForUser(token);
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all invite codes for this mentor
    const { data: relationships, error: relErr } = await supabase
      .from("mentor_relationships")
      .select("id, invite_code, status, student_id, created_at, revoked_at")
      .eq("mentor_id", user.id)
      .order("created_at", { ascending: false });

    if (relErr) {
      return NextResponse.json({ ok: false, error: "Erro ao buscar códigos" }, { status: 500 });
    }

    if (!relationships || relationships.length === 0) {
      return NextResponse.json({ ok: true, codes: [] });
    }

    // Fetch student profiles for active codes
    const activeStudentIds = relationships
      .filter((r) => r.status === "active" && r.student_id)
      .map((r) => r.student_id as string);

    let profileMap = new Map<string, string>();

    if (activeStudentIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", activeStudentIds);

      profileMap = new Map(
        (profiles ?? []).map((p) => [p.user_id, p.display_name])
      );
    }

    const codes = relationships.map((r) => ({
      id: r.id,
      code: r.invite_code,
      status: r.status,
      studentName: r.student_id ? (profileMap.get(r.student_id) ?? null) : null,
      createdAt: r.created_at,
      revokedAt: r.revoked_at,
    }));

    return NextResponse.json({ ok: true, codes });
  } catch {
    return NextResponse.json({ ok: false, error: "Erro interno" }, { status: 500 });
  }
}
