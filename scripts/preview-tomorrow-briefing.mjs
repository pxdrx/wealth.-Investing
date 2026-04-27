// Local preview: generates tomorrow's daily briefing email and sends it
// to a single test address via Resend. Bypasses the cron route (no
// migrations required). Run: node --env-file=.env.local scripts/preview-tomorrow-briefing.mjs <to>

import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const TO = process.argv[2] ?? process.env.PREVIEW_TO ?? "phalmeidapinheiro2004@gmail.com";

function ymd(d) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function startOfWeekMonday(d) {
  const out = new Date(d);
  const day = out.getDay();
  const diff = (day + 6) % 7;
  out.setDate(out.getDate() - diff);
  return ymd(out);
}

function classifyBias(impacts) {
  if (!impacts) return "neutral";
  const idx = impacts.indices?.bias;
  const usd = impacts.dollar?.bias;
  if (idx === "bullish" && usd === "bearish") return "risk-on";
  if (idx === "bearish" && usd === "bullish") return "risk-off";
  return "neutral";
}

function biasLabel(b) {
  return b === "risk-on" ? "Risk-on" : b === "risk-off" ? "Risk-off" : "Neutro";
}

function impactColor(i) {
  return i === "high" ? "#d70015" : i === "medium" ? "#ff9500" : "#86868b";
}

function impactLabel(i) {
  return i === "high" ? "Alto" : i === "medium" ? "Médio" : "Baixo";
}

const ACR = /\b([A-Z]{2,5})\b/;
function extractTicker(title, country) {
  const m = title.match(ACR);
  if (m) return m[1];
  return country ?? "—";
}

const PRINCIPLES = [
  "Stop não é covardia. É contrato com sua tese.",
  "Quem opera sem plano apenas torce pelo mercado.",
  "Risco controlado é a única forma de sobreviver longo prazo.",
  "Disciplina vence talento quando o mercado testa você.",
  "Tese sem invalidação é apenas opinião disfarçada de operação.",
  "Drawdown não é castigo. É informação sobre seu sizing.",
  "Operar bem é cumprir o plano, não acertar o trade.",
  "Mercado paga paciência e cobra impulsividade sem aviso.",
  "Sua próxima operação não precisa recuperar a anterior.",
  "Tamanho de posição decide quanto tempo você fica no jogo.",
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function defaultOvernight(bias) {
  if (bias === "risk-on")
    return "Sessões asiáticas e europeias com tom construtivo. Apetite por risco mantém suporte em índices e ativos de maior beta.";
  if (bias === "risk-off")
    return "Pré-mercado defensivo. Dólar firme e juros pressionando ativos de risco.";
  return "Sem viés definido no overnight. Mercado lateralizado aguardando catalisadores.";
}

function trunc(s, n) {
  if (!s) return "";
  return s.length <= n ? s : s.slice(0, n - 1).trimEnd() + "…";
}

function renderHtml({ date, bias, overnight, today, tomorrow, principle }) {
  const events = today
    .map(
      (e) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f5f5f7;width:60px;font-size:14px;color:#1d1d1f;font-variant-numeric:tabular-nums">${e.time}</td>
        <td style="padding:8px 0;border-bottom:1px solid #f5f5f7;font-size:14px;color:#1d1d1f">
          <strong>${e.ticker}</strong> ${e.label}
        </td>
        <td style="padding:8px 0;border-bottom:1px solid #f5f5f7;text-align:right">
          <span style="font-size:11px;color:${impactColor(e.impact)};text-transform:uppercase;letter-spacing:0.5px">${impactLabel(e.impact)}</span>
        </td>
      </tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"/><title>Briefing ${date}</title></head>
<body style="margin:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:24px 0">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:22px;padding:32px;max-width:600px">
      <tr><td>
        <p style="font-size:13px;color:#86868b;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px">Briefing · ${date} · PREVIEW</p>
        <h1 style="font-size:24px;font-weight:600;color:#1d1d1f;margin:0 0 24px;letter-spacing:-0.022em">Bias do dia: ${biasLabel(bias)}</h1>
        <h2 style="font-size:13px;color:#86868b;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px">Overnight</h2>
        <p style="font-size:15px;line-height:1.5;color:#1d1d1f;margin:0 0 24px">${overnight}</p>
        <h2 style="font-size:13px;color:#86868b;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px">Hoje</h2>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">${events || '<tr><td style="padding:8px 0;color:#86868b;font-size:14px">Sem eventos relevantes mapeados.</td></tr>'}</table>
        <h2 style="font-size:13px;color:#86868b;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px">Amanhã</h2>
        <p style="font-size:14px;color:#1d1d1f;margin:0 0 24px">${tomorrow}</p>
        <blockquote style="border-left:3px solid #1d1d1f;padding:8px 0 8px 16px;margin:24px 0;font-size:15px;color:#1d1d1f;line-height:1.4">${principle}</blockquote>
        <hr style="border:none;border-top:1px solid #e5e5ea;margin:32px 0 16px"/>
        <p style="font-size:12px;color:#86868b;line-height:1.5;margin:0">
          Preview local · gerado em ${new Date().toISOString()} · não é envio em produção.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  if (!url || !key || !resendKey) {
    console.error("Missing required env vars (Supabase + RESEND_API_KEY)");
    process.exit(1);
  }

  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const tomorrow = new Date(Date.now() + 86400_000);
  const dayAfter = new Date(Date.now() + 2 * 86400_000);
  const dateStr = ymd(tomorrow);
  const tomorrowStr = ymd(dayAfter);
  const weekStart = startOfWeekMonday(tomorrow);

  console.log(`[preview] date=${dateStr} weekStart=${weekStart}`);

  const [{ data: events }, { data: nextEvents }, { data: panoramaRows }, { data: adjRows }] = await Promise.all([
    sb.from("economic_events").select("*").eq("date", dateStr),
    sb.from("economic_events").select("*").eq("date", tomorrowStr).in("impact", ["medium", "high"]).order("time", { ascending: true }).limit(5),
    sb.from("weekly_panoramas").select("*").eq("week_start", weekStart).limit(1),
    sb.from("daily_adjustments").select("*").eq("week_start", weekStart).order("generated_at", { ascending: false }).limit(1),
  ]);

  const todayEvents = (events ?? [])
    .filter((e) => e.impact === "medium" || e.impact === "high")
    .sort((a, b) => {
      const w = (i) => (i === "high" ? 0 : i === "medium" ? 1 : 2);
      const di = w(a.impact) - w(b.impact);
      if (di !== 0) return di;
      return (a.time ?? "99:99").localeCompare(b.time ?? "99:99");
    })
    .slice(0, 5)
    .map((e) => ({
      time: e.time ?? "—",
      ticker: extractTicker(e.title, e.country),
      label: trunc(e.title, 80),
      impact: e.impact,
    }));

  const panorama = panoramaRows?.[0] ?? null;
  const bias = classifyBias(panorama?.asset_impacts ?? null);
  const adj = adjRows?.[0] ?? null;
  const overnight = trunc(adj?.narrative ?? panorama?.narrative ?? defaultOvernight(bias), 700);

  const tomorrowLine = (nextEvents ?? []).length > 0
    ? `Próximo destaque: ${trunc(nextEvents[0].title, 60)} (${nextEvents[0].country}).`
    : "Sem eventos relevantes mapeados. Mercado descansa entre sessões.";

  const html = renderHtml({
    date: dateStr,
    bias,
    overnight,
    today: todayEvents,
    tomorrow: tomorrowLine,
    principle: pick(PRINCIPLES),
  });

  const resend = new Resend(resendKey);
  const result = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "wealth.Investing <briefing@owealthinvesting.com>",
    to: TO,
    subject: `[PREVIEW] Briefing ${dateStr} · ${biasLabel(bias)}`,
    html,
    headers: {
      "List-Unsubscribe": "<mailto:unsubscribe@owealthinvesting.com>",
    },
  });

  console.log("[preview] sent", JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
