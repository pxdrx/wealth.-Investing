import { describe, it, expect } from "vitest";
import { renderWeeklyReport } from "@/lib/email/templates/weekly-report";

const base = {
  displayName: "Pedro",
  weekLabel: "Semana de 22 de abril a 28 de abril",
  unsubscribeUrl: "https://owealthinvesting.com/api/unsubscribe?token=t",
};

describe("renderWeeklyReport", () => {
  it("empty week — zero trades", () => {
    const html = renderWeeklyReport({
      ...base,
      totalTrades: 0,
      totalPnl: 0,
      winRate: 0,
      bestTrade: null,
      worstTrade: null,
      streak: 0,
      totalTradesAllTime: 5,
      monthsOfData: 1,
    });
    expect(html).toContain("Nenhum trade registrado");
    expect(html).toContain("RELATÓRIO SEMANAL");
    expect(html).toContain("Pedro");
    expect(html.length).toBeLessThan(20_000);
  });

  it("winning week", () => {
    const html = renderWeeklyReport({
      ...base,
      totalTrades: 8,
      totalPnl: 420.5,
      winRate: 62,
      bestTrade: { symbol: "AAPL", pnl: 180 },
      worstTrade: { symbol: "TSLA", pnl: -45 },
      streak: 3,
      totalTradesAllTime: 142,
      monthsOfData: 4,
    });
    expect(html).toContain("+$420.50");
    expect(html).toContain("AAPL +$180.00");
    expect(html).toContain("TSLA -$45.00");
    expect(html).toContain("🔥");
    expect(html).toContain("Streak atual: <strong>3 dias");
    expect(html).toContain("142 trades");
    expect(html).toContain("4 meses");
  });

  it("losing week", () => {
    const html = renderWeeklyReport({
      ...base,
      totalTrades: 5,
      totalPnl: -215,
      winRate: 20,
      bestTrade: { symbol: "NVDA", pnl: 30 },
      worstTrade: { symbol: "MES", pnl: -120 },
      streak: 0,
      totalTradesAllTime: 60,
      monthsOfData: 2,
    });
    expect(html).toContain("Semana de ajuste");
    expect(html).toContain("-$215.00");
    expect(html).not.toContain("🔥");
    expect(html).toContain("60 trades");
  });

  it("body fits Gmail clipping budget", () => {
    const html = renderWeeklyReport({
      ...base,
      totalTrades: 30,
      totalPnl: 1200,
      winRate: 67,
      bestTrade: { symbol: "X", pnl: 500 },
      worstTrade: { symbol: "Y", pnl: -100 },
      streak: 7,
      totalTradesAllTime: 999,
      monthsOfData: 12,
    });
    expect(html.length).toBeLessThan(102_000); // Gmail clips at 102KB
  });
});
