import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClientForUser } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getStudentKpisByAccount } from "@/lib/student-balance";
import { isMentorPlan } from "@/lib/mentor-guard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { studentId: string } },
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

    const svc = createServiceRoleClient();
    if (!(await isMentorPlan(svc, user.id))) {
      return NextResponse.json({ ok: false, error: "Acesso restrito a mentores" }, { status: 403 });
    }

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

    const accounts = await getStudentKpisByAccount(svc, studentId);

    const totalTrades = accounts.reduce((s, a) => s + a.totalTrades, 0);
    const netPnl = accounts.reduce((s, a) => s + a.netPnl, 0);
    const pnlMonth = accounts.reduce((s, a) => s + a.pnlMonth, 0);
    const balance = accounts.reduce((s, a) => s + a.balance, 0);
    const wins = accounts.reduce(
      (s, a) => s + Math.round((a.winRate / 100) * a.totalTrades),
      0,
    );
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

    return NextResponse.json({
      ok: true,
      accounts,
      aggregate: {
        totalTrades,
        netPnl: round2(netPnl),
        pnlMonth: round2(pnlMonth),
        balance: round2(balance),
        winRate: round2(winRate),
      },
    });
  } catch (err) {
    console.error("[mentor/kpis] unexpected:", err);
    return NextResponse.json({ ok: false, error: "Erro interno" }, { status: 500 });
  }
}
