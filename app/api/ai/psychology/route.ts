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

interface TradeRow {
  id: string;
  symbol: string;
  direction: string;
  opened_at: string;
  closed_at: string | null;
  pnl_usd: number;
  net_pnl_usd: number;
  category: string | null;
  custom_tags: string[] | null;
}

function buildPsychologyPrompt(trades: TradeRow[], period: string): string {
  // Pre-compute analytics for the prompt
  const total = trades.length;
  if (total === 0) return "";

  const wins = trades.filter((t) => t.net_pnl_usd > 0);
  const losses = trades.filter((t) => t.net_pnl_usd < 0);
  const winRate = ((wins.length / total) * 100).toFixed(1);
  const totalPnl = trades.reduce((s, t) => s + t.net_pnl_usd, 0);

  // Hourly performance
  const byHour: Record<number, { wins: number; losses: number; pnl: number; count: number }> = {};
  for (const t of trades) {
    const h = new Date(t.opened_at).getHours();
    if (!byHour[h]) byHour[h] = { wins: 0, losses: 0, pnl: 0, count: 0 };
    byHour[h].count++;
    byHour[h].pnl += t.net_pnl_usd;
    if (t.net_pnl_usd > 0) byHour[h].wins++;
    else byHour[h].losses++;
  }

  const hourlyStr = Object.entries(byHour)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([h, d]) => `${h}h: ${d.count} trades, WR ${((d.wins / d.count) * 100).toFixed(0)}%, PnL $${d.pnl.toFixed(0)}`)
    .join("\n");

  // Streak analysis
  let currentStreak = 0;
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  const streakBreaks: { afterLosses: number; nextTrades: number; nextWins: number }[] = [];
  let consecutiveLosses = 0;

  const sorted = [...trades].sort((a, b) => a.opened_at.localeCompare(b.opened_at));
  for (let i = 0; i < sorted.length; i++) {
    const t = sorted[i];
    if (t.net_pnl_usd > 0) {
      currentStreak = currentStreak > 0 ? currentStreak + 1 : 1;
      maxWinStreak = Math.max(maxWinStreak, currentStreak);
      if (consecutiveLosses >= 2) {
        // Check next 3 trades after loss streak
        const nextTrades = sorted.slice(i, i + 3);
        const nextWins = nextTrades.filter((nt) => nt.net_pnl_usd > 0).length;
        streakBreaks.push({ afterLosses: consecutiveLosses, nextTrades: nextTrades.length, nextWins });
      }
      consecutiveLosses = 0;
    } else {
      currentStreak = currentStreak < 0 ? currentStreak - 1 : -1;
      maxLossStreak = Math.max(maxLossStreak, Math.abs(currentStreak));
      consecutiveLosses++;
    }
  }

  // Daily consistency
  const byDay: Record<string, number> = {};
  for (const t of sorted) {
    const day = t.opened_at.slice(0, 10);
    byDay[day] = (byDay[day] ?? 0) + t.net_pnl_usd;
  }
  const dailyPnls = Object.values(byDay);
  const positiveDays = dailyPnls.filter((p) => p > 0).length;
  const negativeDays = dailyPnls.filter((p) => p < 0).length;

  // Trades per day distribution
  const tradesPerDay: Record<string, number> = {};
  for (const t of sorted) {
    const day = t.opened_at.slice(0, 10);
    tradesPerDay[day] = (tradesPerDay[day] ?? 0) + 1;
  }
  const avgTradesPerDay = Object.values(tradesPerDay).reduce((a, b) => a + b, 0) / Object.keys(tradesPerDay).length;
  const maxTradesInDay = Math.max(...Object.values(tradesPerDay));

  // Symbol distribution
  const bySymbol: Record<string, { count: number; pnl: number; wins: number }> = {};
  for (const t of trades) {
    const sym = t.symbol;
    if (!bySymbol[sym]) bySymbol[sym] = { count: 0, pnl: 0, wins: 0 };
    bySymbol[sym].count++;
    bySymbol[sym].pnl += t.net_pnl_usd;
    if (t.net_pnl_usd > 0) bySymbol[sym].wins++;
  }
  const symbolStr = Object.entries(bySymbol)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 8)
    .map(([s, d]) => `${s}: ${d.count} trades, WR ${((d.wins / d.count) * 100).toFixed(0)}%, PnL $${d.pnl.toFixed(0)}`)
    .join("\n");

  // Revenge trading detection
  const revengeStr = streakBreaks.length > 0
    ? streakBreaks.map((sb) =>
        `Após ${sb.afterLosses} losses seguidos: ${sb.nextTrades} trades seguintes, ${sb.nextWins} wins`
      ).join("\n")
    : "Sem dados suficientes de streaks.";

  // Tags if any
  const allTags = trades.flatMap((t) => t.custom_tags ?? []);
  const tagCounts: Record<string, number> = {};
  for (const tag of allTags) {
    tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
  }
  const tagsStr = Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([tag, count]) => `${tag}: ${count}x`)
    .join(", ");

  return `Analise psicológica de um trader com base nos dados reais dos últimos ${period}.

DADOS DO TRADER:

Total de trades: ${total}
Win Rate: ${winRate}%
P&L Total: $${totalPnl.toFixed(2)}
Wins: ${wins.length} | Losses: ${losses.length}
Maior sequência de wins: ${maxWinStreak}
Maior sequência de losses: ${maxLossStreak}
Dias positivos: ${positiveDays} | Dias negativos: ${negativeDays}
Média trades/dia: ${avgTradesPerDay.toFixed(1)} | Máximo num dia: ${maxTradesInDay}

PERFORMANCE POR HORÁRIO:
${hourlyStr}

PERFORMANCE POR ATIVO:
${symbolStr}

ANÁLISE DE REVENGE TRADING:
${revengeStr}

TAGS REGISTRADAS: ${tagsStr || "Nenhuma"}

INSTRUÇÕES:
Retorne um JSON com EXATAMENTE esta estrutura (sem markdown, sem code blocks, apenas JSON puro):
{
  "profile": "Descrição em 2-3 frases do perfil psicológico predominante deste trader neste período. Seja direto e específico, não genérico.",
  "critical_hours": "Análise dos horários críticos. Quais horários performa bem e quais deveria evitar. Cite os números.",
  "revenge_analysis": "Análise de revenge trading e comportamento pós-perda. Se não há dados suficientes, diga que não foi possível detectar padrão.",
  "consistency": "Análise de consistência — regularidade vs colapsos, padrões semanais se houver.",
  "alerts": ["Alerta 1 direto e específico com números", "Alerta 2", "Alerta 3"],
  "strength": "Um ponto forte identificado nos dados, específico e com números."
}

Tom: direto, sem rodeios, profissional. Nada de "considere" ou "é importante que você". Fale como um mentor que não tem medo de falar a verdade. Use os números dos dados. Se não há dados suficientes para algum campo, diga "Dados insuficientes para esta análise" — não invente.`;
}

export async function POST(req: NextRequest) {
  // 1. Auth
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

  // 2. Parse body
  const body = await req.json().catch(() => ({}));
  const accountId = body.account_id as string | undefined;
  const period = (body.period as string) || "30d";

  if (!accountId) {
    return NextResponse.json({ ok: false, error: "account_id obrigatório" }, { status: 400 });
  }

  // Use the user's authenticated client for all queries
  const supabase = supabaseUser;

  // 3. Check saved analysis — always return if exists (persistent)
  const cacheKey = `psych_${user.id}_${accountId}_${period}`;
  const forceRefresh = body.force === true;
  try {
    const { data: cached } = await supabase
      .from("ai_psychology_cache")
      .select("analysis, created_at")
      .eq("cache_key", cacheKey)
      .maybeSingle();

    if (cached && !forceRefresh) {
      const ageMs = Date.now() - new Date(cached.created_at).getTime();
      const stale = ageMs > 24 * 60 * 60 * 1000; // > 24h = stale
      return NextResponse.json({
        ok: true,
        data: cached.analysis,
        cached: true,
        stale,
        generated_at: cached.created_at,
      });
    }
  } catch {
    // Cache read failed — proceed without cache
  }

  // 3b. Rate limit: max 3 AI generations per user per day
  const MAX_DAILY_GENERATIONS = 3;
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count } = await supabase
      .from("ai_psychology_cache")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", todayStart.toISOString());

    if (count !== null && count >= MAX_DAILY_GENERATIONS) {
      return NextResponse.json({
        ok: false,
        error: `Limite de ${MAX_DAILY_GENERATIONS} análises por dia atingido. Tente novamente amanhã.`,
        daily_limit_reached: true,
      }, { status: 429 });
    }
  } catch {
    // Rate limit check failed — proceed (fail open)
  }

  // 4. Fetch trades
  const periodDays = period === "7d" ? 7 : period === "30d" ? 30 : period === "90d" ? 90 : 365 * 5;
  const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();

  const { data: trades, error: tradesErr } = await supabase
    .from("journal_trades")
    .select("id, symbol, direction, opened_at, closed_at, pnl_usd, net_pnl_usd, category, custom_tags")
    .eq("user_id", user.id)
    .eq("account_id", accountId)
    .gte("opened_at", since)
    .order("opened_at", { ascending: true });

  if (tradesErr) {
    return NextResponse.json({ ok: false, error: "Erro ao buscar trades" }, { status: 500 });
  }

  if (!trades || trades.length < 5) {
    return NextResponse.json({
      ok: true,
      data: {
        profile: "Dados insuficientes. São necessários pelo menos 5 trades para gerar uma análise psicológica.",
        critical_hours: "Dados insuficientes para esta análise.",
        revenge_analysis: "Dados insuficientes para esta análise.",
        consistency: "Dados insuficientes para esta análise.",
        alerts: ["Registre mais trades para desbloquear a análise psicológica."],
        strength: "Dados insuficientes para esta análise.",
      },
      cached: false,
    });
  }

  // 5. Build prompt and call Claude
  const prompt = buildPsychologyPrompt(trades as TradeRow[], period);

  // Check if Anthropic API key is configured
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("[psychology] ANTHROPIC_API_KEY not configured");
    return NextResponse.json({ ok: false, error: "Análise IA indisponível no momento. A chave da API não está configurada." }, { status: 503 });
  }

  try {
    const response = await getAnthropic().messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content
      .filter((c): c is Anthropic.TextBlock => c.type === "text")
      .map((c) => c.text)
      .join("");

    // Parse JSON from response — handle markdown fences and plain text fallback
    let analysis;
    try {
      // Strip markdown code fences if present
      const cleaned = text.replace(/^```(?:json)?\s*/m, "").replace(/\s*```$/m, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      analysis = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);
    } catch {
      // If JSON parse fails, return raw text as profile (graceful degradation)
      console.warn("[psychology] JSON parse failed, using raw text. First 200 chars:", text.slice(0, 200));
      analysis = {
        profile: text,
        critical_hours: "",
        revenge_analysis: "",
        consistency: "",
        alerts: [],
        strength: "",
      };
    }

    // 6. Cache result (non-blocking)
    try {
      await supabase
        .from("ai_psychology_cache")
        .upsert(
          { cache_key: cacheKey, user_id: user.id, account_id: accountId, period, analysis, created_at: new Date().toISOString() },
          { onConflict: "cache_key" }
        );
    } catch {
      // Cache write failed — non-critical
    }

    return NextResponse.json({ ok: true, data: analysis, cached: false, generated_at: new Date().toISOString() });
  } catch (err) {
    const error = err as Error;
    const msg = error.message || String(err);
    console.error("[psychology] Claude API error:", msg);
    // Surface specific error types to frontend
    if (msg.includes("authentication") || msg.includes("invalid x-api-key") || msg.includes("invalid_api_key")) {
      return NextResponse.json({ ok: false, error: "Chave da API inválida ou expirada. Verifique a configuração." }, { status: 401 });
    }
    if (msg.includes("credit") || msg.includes("balance") || msg.includes("billing") || msg.includes("insufficient_quota")) {
      return NextResponse.json({ ok: false, error: "Sem créditos na API de IA. A análise psicológica estará disponível em breve." }, { status: 402 });
    }
    if (msg.includes("rate") || msg.includes("429") || msg.includes("overloaded")) {
      return NextResponse.json({ ok: false, error: "Serviço temporariamente sobrecarregado. Aguarde 1 minuto e tente novamente." }, { status: 429 });
    }
    console.error("[psychology] Full error:", JSON.stringify(err, Object.getOwnPropertyNames(err as object)));
    return NextResponse.json({ ok: false, error: "Erro ao gerar análise. Tente novamente em alguns instantes." }, { status: 500 });
  }
}
