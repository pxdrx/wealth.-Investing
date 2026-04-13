import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClientForUser } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  req: NextRequest,
  { params }: { params: { studentId: string } }
) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { studentId } = params;
    if (!UUID_RE.test(studentId)) {
      return NextResponse.json({ ok: false, error: "ID de aluno inválido" }, { status: 400 });
    }

    const supabase = createSupabaseClientForUser(token);
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Verify active relationship
    const { data: relationship, error: relErr } = await supabase
      .from("mentor_relationships")
      .select("id")
      .eq("mentor_id", user.id)
      .eq("student_id", studentId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (relErr) {
      return NextResponse.json({ ok: false, error: "Erro ao verificar vínculo" }, { status: 500 });
    }

    if (!relationship) {
      return NextResponse.json({ ok: false, error: "Vínculo não encontrado" }, { status: 403 });
    }

    // Fetch trades (all accounts) for this student — service role bypasses RLS
    const svc = createServiceRoleClient();
    const { data: trades, error: tradesErr } = await svc
      .from("journal_trades")
      .select("id, symbol, direction, open_time, close_time, pnl_usd, net_pnl_usd, account_id, emotion, discipline, setup_quality, custom_tags")
      .eq("user_id", studentId)
      .order("open_time", { ascending: false })
      .limit(100);

    if (tradesErr) {
      return NextResponse.json({ ok: false, error: "Erro ao buscar trades" }, { status: 500 });
    }

    // Fetch mentor notes for this student
    const { data: notes, error: notesErr } = await supabase
      .from("mentor_notes")
      .select("*")
      .eq("mentor_id", user.id)
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });

    if (notesErr) {
      return NextResponse.json({ ok: false, error: "Erro ao buscar notas" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, trades: trades ?? [], notes: notes ?? [] });
  } catch {
    return NextResponse.json({ ok: false, error: "Erro interno" }, { status: 500 });
  }
}
