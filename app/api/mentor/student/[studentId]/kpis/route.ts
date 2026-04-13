import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClientForUser } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface KpiBlock {
  totalTrades: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  profitFactor: number;
  bestTrade: number;
  worstTrade: number;
}

function calcKpis(trades: { pnl_usd: number | null }[]): KpiBlock {
  if (trades.length === 0) {
    return {
      totalTrades: 0,
      winRate: 0,
      totalPnl: 0,
      avgPnl: 0,
      profitFactor: 0,
      bestTrade: 0,
      worstTrade: 0,
    };
  }

  const pnls = trades.map((t) => t.pnl_usd ?? 0);
  const totalTrades = pnls.length;
  const wins = pnls.filter((p) => p > 0);
  const losses = pnls.filter((p) => p < 0);
  const totalPnl = pnls.reduce((s, p) => s + p, 0);
  const grossProfit = wins.reduce((s, p) => s + p, 0);
  const grossLoss = Math.abs(losses.reduce((s, p) => s + p, 0));

  return {
    totalTrades,
    winRate: Math.round((wins.length / totalTrades) * 10000) / 100,
    totalPnl: Math.round(totalPnl * 100) / 100,
    avgPnl: Math.round((totalPnl / totalTrades) * 100) / 100,
    profitFactor: grossLoss > 0 ? Math.round((grossProfit / grossLoss) * 100) / 100 : grossProfit > 0 ? 999.99 : 0,
    bestTrade: Math.round(Math.max(...pnls) * 100) / 100,
    worstTrade: Math.round(Math.min(...pnls) * 100) / 100,
  };
}

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

    // Fetch all trades for the student
    const { data: allTrades, error: tradesErr } = await supabase
      .from("journal_trades")
      .select("pnl_usd, open_time")
      .eq("user_id", studentId);

    if (tradesErr) {
      return NextResponse.json({ ok: false, error: "Erro ao buscar trades" }, { status: 500 });
    }

    const trades = allTrades ?? [];

    // Filter this month's trades
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthTrades = trades.filter((t) => t.open_time >= monthStart);

    return NextResponse.json({
      ok: true,
      kpis: {
        month: calcKpis(monthTrades),
        allTime: calcKpis(trades),
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Erro interno" }, { status: 500 });
  }
}
