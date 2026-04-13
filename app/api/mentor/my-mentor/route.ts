import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClientForUser } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

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

    // Find active mentor relationship for this student
    const { data: relationship, error: relErr } = await supabase
      .from("mentor_relationships")
      .select("mentor_id, created_at")
      .eq("student_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (relErr) {
      return NextResponse.json({ ok: false, error: "Erro ao buscar mentor" }, { status: 500 });
    }

    if (!relationship) {
      return NextResponse.json({ ok: true, mentor: null });
    }

    // Fetch mentor profile — service role bypasses RLS for cross-user read
    const svc = createServiceRoleClient();
    const { data: profile } = await svc
      .from("profiles")
      .select("display_name")
      .eq("id", relationship.mentor_id)
      .maybeSingle();

    return NextResponse.json({
      ok: true,
      mentor: {
        id: relationship.mentor_id,
        displayName: profile?.display_name ?? "Mentor",
        since: relationship.created_at,
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Erro interno" }, { status: 500 });
  }
}
