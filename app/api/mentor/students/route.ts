import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClientForUser } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getStudentLastUsedAccount } from "@/lib/student-balance";

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

    const { data: relationships, error: relErr } = await svc
      .from("mentor_relationships")
      .select("id, student_id, created_at")
      .eq("mentor_id", user.id)
      .eq("status", "active")
      .not("student_id", "is", null);

    if (relErr) {
      console.error("[mentor/students] relErr:", relErr.message);
      return NextResponse.json({ ok: false, error: "Erro ao buscar alunos" }, { status: 500 });
    }

    if (!relationships || relationships.length === 0) {
      return NextResponse.json({ ok: true, students: [] });
    }

    const studentIds = relationships.map((r) => r.student_id).filter(Boolean) as string[];
    if (studentIds.length === 0) {
      return NextResponse.json({ ok: true, students: [] });
    }

    const { data: profiles, error: profErr } = await svc
      .from("profiles")
      .select("id, display_name")
      .in("id", studentIds);

    if (profErr) {
      return NextResponse.json({ ok: false, error: "Erro ao buscar perfis" }, { status: 500 });
    }

    const profileMap = new Map(
      (profiles ?? []).map((p: { id: string; display_name: string | null }) => [p.id, p.display_name]),
    );

    const statsList = await Promise.all(
      studentIds.map((sid) => getStudentLastUsedAccount(svc, sid)),
    );
    const statsMap = new Map(studentIds.map((sid, i) => [sid, statsList[i]]));

    const students = relationships.map((r) => {
      const sid = r.student_id!;
      const stats = statsMap.get(sid) ?? null;
      return {
        id: sid,
        displayName: profileMap.get(sid) ?? "Aluno",
        linkedAt: r.created_at,
        lastAccountName: stats?.accountName ?? null,
        lastAccountBalance: stats?.balance ?? 0,
        lastAccountPnl: stats?.netPnl ?? 0,
        lastAccountTotalTrades: stats?.totalTrades ?? 0,
        lastTradeDate: stats?.lastTradeDate ?? null,
      };
    });

    return NextResponse.json({ ok: true, students });
  } catch (err) {
    console.error("[mentor/students] unexpected:", err);
    return NextResponse.json({ ok: false, error: "Erro interno" }, { status: 500 });
  }
}
