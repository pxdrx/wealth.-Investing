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

    // Get active relationships with student profiles
    const { data: relationships, error: relErr } = await supabase
      .from("mentor_relationships")
      .select("id, student_id, created_at")
      .eq("mentor_id", user.id)
      .eq("status", "active");

    if (relErr) {
      return NextResponse.json({ ok: false, error: "Erro ao buscar alunos" }, { status: 500 });
    }

    if (!relationships || relationships.length === 0) {
      return NextResponse.json({ ok: true, students: [] });
    }

    const studentIds = relationships.map((r) => r.student_id).filter(Boolean) as string[];

    // Fetch profiles for all students
    const { data: profiles, error: profErr } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", studentIds);

    if (profErr) {
      return NextResponse.json({ ok: false, error: "Erro ao buscar perfis" }, { status: 500 });
    }

    const profileMap = new Map(
      (profiles ?? []).map((p) => [p.user_id, p.display_name])
    );

    // Get this month's start date
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Fetch monthly trade stats for all students in one query
    const { data: trades, error: tradesErr } = await supabase
      .from("journal_trades")
      .select("user_id, pnl_usd, open_time")
      .in("user_id", studentIds)
      .gte("open_time", monthStart);

    if (tradesErr) {
      return NextResponse.json({ ok: false, error: "Erro ao buscar trades" }, { status: 500 });
    }

    // Fetch last trade date for each student (limit to 1 per student via post-processing)
    const { data: lastTrades, error: lastErr } = await supabase
      .from("journal_trades")
      .select("user_id, open_time")
      .in("user_id", studentIds)
      .order("open_time", { ascending: false })
      .limit(studentIds.length * 2);

    if (lastErr) {
      return NextResponse.json({ ok: false, error: "Erro ao buscar último trade" }, { status: 500 });
    }

    // Build stats per student
    const statsMap = new Map<string, {
      totalTrades: number;
      netPnl: number;
      winRate: number;
      lastTradeDate: string | null;
    }>();

    // Initialize
    for (const sid of studentIds) {
      statsMap.set(sid, { totalTrades: 0, netPnl: 0, winRate: 0, lastTradeDate: null });
    }

    // Aggregate monthly trades
    const tradesByStudent = new Map<string, { pnl_usd: number }[]>();
    for (const t of trades ?? []) {
      const arr = tradesByStudent.get(t.user_id) ?? [];
      arr.push({ pnl_usd: t.pnl_usd });
      tradesByStudent.set(t.user_id, arr);
    }

    tradesByStudent.forEach((studentTrades, sid) => {
      const total = studentTrades.length;
      const netPnl = studentTrades.reduce((sum: number, t: { pnl_usd: number }) => sum + (t.pnl_usd ?? 0), 0);
      const wins = studentTrades.filter((t: { pnl_usd: number }) => (t.pnl_usd ?? 0) > 0).length;
      const stats = statsMap.get(sid);
      if (stats) {
        stats.totalTrades = total;
        stats.netPnl = Math.round(netPnl * 100) / 100;
        stats.winRate = total > 0 ? Math.round((wins / total) * 10000) / 100 : 0;
      }
    });

    // Last trade dates
    const lastTradeMap = new Map<string, string>();
    for (const t of lastTrades ?? []) {
      if (!lastTradeMap.has(t.user_id)) {
        lastTradeMap.set(t.user_id, t.open_time);
      }
    }
    lastTradeMap.forEach((date, sid) => {
      const stats = statsMap.get(sid);
      if (stats) stats.lastTradeDate = date;
    });

    // Build response
    const students = relationships.map((r) => ({
      id: r.student_id,
      displayName: profileMap.get(r.student_id!) ?? "Aluno",
      linkedAt: r.created_at,
      ...statsMap.get(r.student_id!),
    }));

    return NextResponse.json({ ok: true, students });
  } catch {
    return NextResponse.json({ ok: false, error: "Erro interno" }, { status: 500 });
  }
}
