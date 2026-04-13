interface MorningBriefingData {
  displayName: string;
  date: string;
  events: Array<{ time: string; title: string; impact: string; currency: string }>;
  yesterdaySummary?: {
    trades: number;
    pnl: number;
    winRate: number;
  };
  streak: number;
  isPro: boolean;
}

export function renderMorningBriefing(data: MorningBriefingData): string {
  const { displayName, date, events, yesterdaySummary, streak, isPro } = data;

  const highImpactEvents = events.filter((e) => e.impact === "high");
  const mediumImpactEvents = events.filter((e) => e.impact === "medium");

  const eventsHtml = [...highImpactEvents, ...mediumImpactEvents]
    .slice(0, 8)
    .map((e) => {
      const color = e.impact === "high" ? "#ef4444" : "#f59e0b";
      const dot = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:6px"></span>`;
      return `<tr><td style="padding:6px 0;font-size:13px;color:#666">${e.time}</td><td style="padding:6px 8px;font-size:13px">${dot}${e.currency} — ${e.title}</td></tr>`;
    })
    .join("");

  const yesterdayHtml = yesterdaySummary && isPro
    ? `
    <div style="background:#f8f9fa;border-radius:12px;padding:16px;margin:16px 0">
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#333">Ontem</p>
      <p style="margin:0;font-size:13px;color:#666">
        ${yesterdaySummary.trades} trades ·
        <span style="color:${yesterdaySummary.pnl >= 0 ? "#16a34a" : "#ef4444"};font-weight:600">
          ${yesterdaySummary.pnl >= 0 ? "+" : ""}$${yesterdaySummary.pnl.toFixed(2)}
        </span> ·
        Win rate: ${yesterdaySummary.winRate}%
      </p>
    </div>`
    : "";

  const streakHtml = streak > 0
    ? `<p style="margin:0 0 16px;font-size:13px;color:#666">🔥 Streak: <strong>${streak} ${streak === 1 ? "dia" : "dias"}</strong> consecutivos</p>`
    : "";

  const upgradeHtml = !isPro
    ? `<div style="background:#eff6ff;border-radius:12px;padding:12px 16px;margin:16px 0;text-align:center">
        <p style="margin:0;font-size:12px;color:#3b82f6">
          Faça upgrade para Pro e receba o briefing completo com AI insights ·
          <a href="https://owealthinvesting.com/app/pricing" style="color:#2563eb;font-weight:600">Ver planos</a>
        </p>
      </div>`
    : "";

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f7">
<div style="max-width:520px;margin:0 auto;padding:32px 20px">
  <div style="background:#fff;border-radius:16px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,0.06)">
    <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#999">BRIEFING MATINAL</p>
    <h1 style="margin:0 0 4px;font-size:20px;font-weight:700;color:#111">Bom dia, ${displayName} 👋</h1>
    <p style="margin:0 0 20px;font-size:13px;color:#666">${date}</p>

    ${streakHtml}
    ${yesterdayHtml}

    ${events.length > 0 ? `
    <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#333">Eventos do dia</p>
    <table style="width:100%;border-collapse:collapse">${eventsHtml}</table>
    ` : `<p style="margin:16px 0;font-size:13px;color:#666">Sem eventos de alto impacto hoje. Bom dia para focar no operacional.</p>`}

    ${upgradeHtml}

    <div style="margin-top:20px;text-align:center">
      <a href="https://owealthinvesting.com/app"
         style="display:inline-block;background:#111;color:#fff;padding:10px 24px;border-radius:999px;font-size:13px;font-weight:600;text-decoration:none">
        Abrir Dashboard
      </a>
    </div>
  </div>
  <p style="text-align:center;margin:16px 0 0;font-size:11px;color:#999">
    wealth.Investing · <a href="https://owealthinvesting.com/app/settings" style="color:#999">Configurações</a>
  </p>
</div>
</body></html>`;
}
