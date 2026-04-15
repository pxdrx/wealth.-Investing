import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClientForUser } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

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

    // RLS allows students to read their own mentor_notes (student_id = auth.uid())
    const { data: notes, error: notesErr } = await supabase
      .from("mentor_notes")
      .select("id, mentor_id, trade_id, note_date, content, rating, created_at")
      .eq("student_id", user.id)
      .order("created_at", { ascending: false });

    if (notesErr) {
      return NextResponse.json({ ok: false, error: "Erro ao buscar feedback" }, { status: 500 });
    }

    const list = notes ?? [];
    if (list.length === 0) {
      return NextResponse.json({ ok: true, notes: [] });
    }

    // Enrich with mentor display name (single fetch per unique mentor)
    const mentorIds = Array.from(new Set(list.map((n) => n.mentor_id)));
    const svc = createServiceRoleClient();
    const { data: profiles } = await svc
      .from("profiles")
      .select("id, display_name")
      .in("id", mentorIds);

    const nameById = new Map<string, string>();
    (profiles ?? []).forEach((p) => {
      nameById.set(p.id, p.display_name ?? "Mentor");
    });

    const enriched = list.map((n) => ({
      ...n,
      mentor_name: nameById.get(n.mentor_id) ?? "Mentor",
    }));

    return NextResponse.json({ ok: true, notes: enriched });
  } catch {
    return NextResponse.json({ ok: false, error: "Erro interno" }, { status: 500 });
  }
}
