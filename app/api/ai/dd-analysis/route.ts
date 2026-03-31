import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseClientForUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

let _anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic();
  return _anthropic;
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ ok: false, error: "Não autorizado" }, { status: 401 });
  }
  const token = authHeader.replace("Bearer ", "");
  const supabaseUser = createSupabaseClientForUser(token);
  const { data: { user }, error: authErr } = await supabaseUser.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "Token inválido" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const accountId = body.account_id as string;
  const accountName = body.account_name as string;
  const date = body.date as string; // YYYY-MM-DD
  const ddPercent = body.dd_percent as number;
  const ddLimit = body.dd_limit as number;

  if (!accountId || !date) {
    return NextResponse.json({ ok: false, error: "Dados insuficientes" }, { status: 400 });
  }

  // Fetch today's trades for analysis
  const startOfDay = `${date}T00:00:00.000Z`;
  const endOfDay = `${date}T23:59:59.999Z`;

  const { data: trades } = await supabaseUser
    .from("journal_trades")
    .select("symbol, direction, opened_at, pnl_usd, fees_usd, net_pnl_usd")
    .eq("account_id", accountId)
    .gte("opened_at", startOfDay)
    .lte("opened_at", endOfDay)
    .order("opened_at", { ascending: true })
    .limit(200);

  if (!trades || trades.length === 0) {
    return NextResponse.json({ ok: true, data: { analysis: "Nenhum trade encontrado para análise." } });
  }

  const tradesStr = trades.map((t, i) => {
    const time = new Date(t.opened_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return `${i + 1}. ${t.symbol} ${t.direction} às ${time} — P&L: $${(t.net_pnl_usd ?? 0).toFixed(2)}`;
  }).join("\n");

  const totalPnl = trades.reduce((s, t) => s + (t.net_pnl_usd ?? 0), 0);

  const prompt = `Você é um gestor de risco experiente analisando a quebra de drawdown diário de um trader.

DADOS:
- Conta: ${accountName || "Prop Account"}
- Data: ${date}
- DD Diário atingido: ${ddPercent.toFixed(2)}% (limite: ${ddLimit}%)
- P&L total do dia: $${totalPnl.toFixed(2)}
- Trades do dia:
${tradesStr}

ANÁLISE:
Analise a sequência dos trades, os símbolos operados, horários, resultado individual de cada operação, e identifique o que levou à quebra do drawdown diário.

Seja direto, sem rodeios, sem frases genéricas de coaching. Fale como um gestor de risco que precisa explicar ao trader o que aconteceu e por quê. Use os dados específicos. Em PT-BR. Máximo 250 palavras.`;

  try {
    const response = await getAnthropic().messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content
      .filter((c): c is Anthropic.TextBlock => c.type === "text")
      .map((c) => c.text)
      .join("");

    return NextResponse.json({ ok: true, data: { analysis: text } });
  } catch (err) {
    console.error("[dd-analysis] Claude API error:", err);
    return NextResponse.json({ ok: false, error: "Erro na análise. Tente novamente." }, { status: 500 });
  }
}
