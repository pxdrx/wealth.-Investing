import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClientForUser } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { isMentorPlan } from "@/lib/mentor-guard";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

    const svc = createServiceRoleClient();
    if (!(await isMentorPlan(svc, user.id))) {
      return NextResponse.json({ ok: false, error: "Acesso restrito a mentores" }, { status: 403 });
    }

    const studentId = req.nextUrl.searchParams.get("student_id");
    if (!studentId || !UUID_RE.test(studentId)) {
      return NextResponse.json({ ok: false, error: "ID de aluno inválido" }, { status: 400 });
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

    const { data: notes, error: notesErr } = await supabase
      .from("mentor_notes")
      .select("*")
      .eq("mentor_id", user.id)
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });

    if (notesErr) {
      return NextResponse.json({ ok: false, error: "Erro ao buscar notas" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, notes: notes ?? [] });
  } catch {
    return NextResponse.json({ ok: false, error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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

    const svc = createServiceRoleClient();
    if (!(await isMentorPlan(svc, user.id))) {
      return NextResponse.json({ ok: false, error: "Acesso restrito a mentores" }, { status: 403 });
    }

    const body = await req.json() as {
      studentId?: string;
      content?: string;
      rating?: number;
      tradeId?: string;
      noteDate?: string;
    };

    const { studentId, content, rating, tradeId, noteDate } = body;

    if (!studentId || !UUID_RE.test(studentId)) {
      return NextResponse.json({ ok: false, error: "ID de aluno inválido" }, { status: 400 });
    }

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ ok: false, error: "Conteúdo é obrigatório" }, { status: 400 });
    }

    if (tradeId && !UUID_RE.test(tradeId)) {
      return NextResponse.json({ ok: false, error: "ID de trade inválido" }, { status: 400 });
    }

    if (rating !== undefined && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
      return NextResponse.json({ ok: false, error: "Rating deve ser entre 1 e 5" }, { status: 400 });
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

    const { data: note, error: insertErr } = await supabase
      .from("mentor_notes")
      .insert({
        relationship_id: relationship.id,
        mentor_id: user.id,
        student_id: studentId,
        content: content.trim(),
        rating: rating ?? null,
        trade_id: tradeId ?? null,
        note_date: noteDate ?? new Date().toISOString().split("T")[0],
      })
      .select()
      .maybeSingle();

    if (insertErr) {
      return NextResponse.json({ ok: false, error: "Erro ao criar nota" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, note });
  } catch {
    return NextResponse.json({ ok: false, error: "Erro interno" }, { status: 500 });
  }
}
