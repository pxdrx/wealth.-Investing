/**
 * Pure functions for live drawdown calculation and alert evaluation.
 * Used by both the client-side hook and server-side cron.
 */

export interface LiveDdResult {
  dailyPnl: number;
  dailyDdPct: number;
  overallPnl: number;
  overallDdPct: number;
}

export interface AlertConfig {
  id: string;
  alertType: "daily_dd" | "overall_dd";
  warningThresholdPct: number;
  criticalThresholdPct: number;
  isActive: boolean;
}

export interface AlertAction {
  alertType: "daily_dd" | "overall_dd";
  severity: "warning" | "critical" | "breach";
  thresholdPct: number;
  actualPct: number;
  message: string;
}

/**
 * Calculates live daily drawdown.
 * @param currentEquity - Current equity from MetaAPI
 * @param dayStartEquity - Equity at the start of the trading day (per reset_timezone)
 * @param startingBalance - Prop account starting balance
 */
export function calculateLiveDailyDd(
  currentEquity: number,
  dayStartEquity: number,
  startingBalance: number
): { pnl: number; ddPct: number } {
  const pnl = currentEquity - dayStartEquity;
  // DD% = how much of the starting balance has been lost today (positive = loss)
  const ddPct = startingBalance > 0 ? Math.max(0, (-pnl / startingBalance) * 100) : 0;

  return { pnl, ddPct };
}

/**
 * Calculates live overall drawdown.
 * @param currentEquity - Current equity from MetaAPI
 * @param startingBalance - Prop account starting balance
 * @param highWaterMark - Highest equity ever recorded (for trailing DD)
 * @param drawdownType - "static" or "trailing"
 */
export function calculateLiveOverallDd(
  currentEquity: number,
  startingBalance: number,
  highWaterMark: number,
  drawdownType: "static" | "trailing"
): { pnl: number; ddPct: number } {
  if (drawdownType === "trailing") {
    // Trailing DD: loss from the high water mark
    const pnl = currentEquity - highWaterMark;
    const ddPct = highWaterMark > 0 ? Math.max(0, (-pnl / startingBalance) * 100) : 0;
    return { pnl, ddPct };
  }

  // Static DD: loss from starting balance
  const pnl = currentEquity - startingBalance;
  const ddPct = startingBalance > 0 ? Math.max(0, (-pnl / startingBalance) * 100) : 0;
  return { pnl, ddPct };
}

/**
 * Evaluates alert thresholds and returns actions for alerts that should fire.
 * Does NOT handle dedup — caller must check if alert was already sent recently.
 */
export function evaluateAlerts(
  ddResult: LiveDdResult,
  configs: AlertConfig[],
  accountName: string
): AlertAction[] {
  const actions: AlertAction[] = [];

  for (const config of configs) {
    if (!config.isActive) continue;

    const actualPct = config.alertType === "daily_dd"
      ? ddResult.dailyDdPct
      : ddResult.overallDdPct;

    if (actualPct <= 0) continue;

    const label = config.alertType === "daily_dd"
      ? "Drawdown diário"
      : "Drawdown geral";

    if (actualPct >= config.criticalThresholdPct) {
      actions.push({
        alertType: config.alertType,
        severity: "critical",
        thresholdPct: config.criticalThresholdPct,
        actualPct,
        message: `🔴 ${label} em ${actualPct.toFixed(1)}% na conta ${accountName}. Limite crítico de ${config.criticalThresholdPct}% atingido. Considere fechar operações para proteger a conta.`,
      });
    } else if (actualPct >= config.warningThresholdPct) {
      actions.push({
        alertType: config.alertType,
        severity: "warning",
        thresholdPct: config.warningThresholdPct,
        actualPct,
        message: `⚠️ ${label} em ${actualPct.toFixed(1)}% na conta ${accountName}. Aproximando do limite de ${config.criticalThresholdPct}%.`,
      });
    }
  }

  return actions;
}

/**
 * Calculates the full live DD result from equity readings.
 */
export function calculateFullDd(
  currentEquity: number,
  dayStartEquity: number,
  startingBalance: number,
  highWaterMark: number,
  drawdownType: "static" | "trailing"
): LiveDdResult {
  const daily = calculateLiveDailyDd(currentEquity, dayStartEquity, startingBalance);
  const overall = calculateLiveOverallDd(currentEquity, startingBalance, highWaterMark, drawdownType);

  return {
    dailyPnl: daily.pnl,
    dailyDdPct: daily.ddPct,
    overallPnl: overall.pnl,
    overallDdPct: overall.ddPct,
  };
}
