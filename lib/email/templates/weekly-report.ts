interface WeeklyReportData {
  displayName: string;
  weekLabel: string;
  totalTrades: number;
  totalPnl: number;
  winRate: number;
  bestTrade: { symbol: string; pnl: number } | null;
  worstTrade: { symbol: string; pnl: number } | null;
  streak: number;
  totalTradesAllTime: number;
  monthsOfData: number;
}

export function renderWeeklyReport(data: WeeklyReportData): string {
  const {
    displayName, weekLabel, totalTrades, totalPnl, winRate,
    bestTrade, worstTrade, streak, totalTradesAllTime, monthsOfData,
  } = data;

  const pnlColor = totalPnl >= 0 ? "#16a34a" : "#ef4444";
  const pnlSign = totalPnl >= 0 ? "+" : "";

  const bestHtml = bestTrade
    ? `<div style="flex:1;background:#f0fdf4;border-radius:10px;padding:12px">
        <p style="margin:0;font-size:11px;color:#666">Melhor trade</p>
        <p style="margin:4px 0 0;font-size:14px;font-weight:700;color:#16a34a">${bestTrade.symbol} +$${bestTrade.pnl.toFixed(2)}</p>
       </div>`
    : "";

  const worstHtml = worstTrade
    ? `<div style="flex:1;background:#fef2f2;border-radius:10px;padding:12px">
        <p style="margin:0;font-size:11px;color:#666">Pior trade</p>
        <p style="margin:4px 0 0;font-size:14px;font-weight:700;color:#ef4444">${worstTrade.symbol} -$${Math.abs(worstTrade.pnl).toFixed(2)}</p>
       </div>`
    : "";

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f7">
<div style="max-width:520px;margin:0 auto;padding:32px 20px">
  <div style="background:#fff;border-radius:16px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,0.06)">
    <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#999">RELATÓRIO SEMANAL</p>
    <h1 style="margin:0 0 4px;font-size:20px;font-weight:700;color:#111">Sua semana, ${displayName}</h1>
    <p style="margin:0 0 20px;font-size:13px;color:#666">${weekLabel}</p>

    ${totalTrades === 0 ? `
    <div style="background:#f8f9fa;border-radius:12px;padding:20px;text-align:center;margin:16px 0">
      <p style="margin:0;font-size:14px;color:#666">Nenhum trade registrado esta semana.</p>
      <p style="margin:8px 0 0;font-size:12px;color:#999">Logue seus trades para receber insights personalizados.</p>
    </div>
    ` : `
    <!-- KPI Grid -->
    <div style="display:flex;gap:12px;margin-bottom:16px">
      <div style="flex:1;background:#f8f9fa;border-radius:10px;padding:12px;text-align:center">
        <p style="margin:0;font-size:11px;color:#666">Trades</p>
        <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#111">${totalTrades}</p>
      </div>
      <div style="flex:1;background:#f8f9fa;border-radius:10px;padding:12px;text-align:center">
        <p style="margin:0;font-size:11px;color:#666">P&L</p>
        <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:${pnlColor}">${pnlSign}$${Math.abs(totalPnl).toFixed(2)}</p>
      </div>
      <div style="flex:1;background:#f8f9fa;border-radius:10px;padding:12px;text-align:center">
        <p style="margin:0;font-size:11px;color:#666">Win Rate</p>
        <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#111">${winRate}%</p>
      </div>
    </div>

    <!-- Best/Worst -->
    <div style="display:flex;gap:12px;margin-bottom:16px">
      ${bestHtml}
      ${worstHtml}
    </div>
    `}

    <!-- Streak -->
    ${streak > 0 ? `<p style="margin:0 0 16px;font-size:13px;color:#666">🔥 Streak atual: <strong>${streak} dias</strong></p>` : ""}

    <!-- Data accumulation -->
    <div style="background:#eff6ff;border-radius:10px;padding:12px;margin-bottom:16px">
      <p style="margin:0;font-size:12px;color:#3b82f6">
        📊 Você tem <strong>${totalTradesAllTime} trades</strong> logados em <strong>${monthsOfData} ${monthsOfData === 1 ? "mês" : "meses"}</strong>.
        Seus analytics melhoram a cada semana.
      </p>
    </div>

    <div style="text-align:center">
      <a href="https://owealthinvesting.com/app/journal"
         style="display:inline-block;background:#111;color:#fff;padding:10px 24px;border-radius:999px;font-size:13px;font-weight:600;text-decoration:none">
        Ver relatório completo
      </a>
    </div>
  </div>
  <p style="text-align:center;margin:16px 0 0;font-size:11px;color:#999">
    wealth.Investing · <a href="https://owealthinvesting.com/app/settings" style="color:#999">Configurações</a>
  </p>
</div>
</body></html>`;
}
