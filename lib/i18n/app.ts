// [C-15] App namespace (app.*) dictionary — Track C owned.
//
// Why not next-intl JSON messages?
// Track B owns `messages/{pt,en}.json` per TRACK-COORDINATION.md. Rather than
// cross the boundary, Track C ships its own lightweight typed dictionary for
// the authenticated surface. When Track B merges, this can be folded into
// next-intl's message tree under the `app.*` key with a mechanical copy.
//
// Usage:
//   import { tApp } from "@/lib/i18n/app";
//   tApp("pt", "journal.title") -> "Journal"
//
// Falls back to the PT string for missing EN keys so the UI never renders
// raw keys.

export type AppLocale = "pt" | "en";

type Dict = Record<string, string>;

const PT: Dict = {
  "journal.title": "Journal",
  "journal.subtitle": "Registro de operações e análise de performance.",
  "journal.add-trade": "Adicionar Trade",
  "journal.show-values": "Mostrar",
  "journal.hide-values": "Ocultar",
  "macro.title": "Inteligência Macro",
  "macro.subtitle": "Terminal quantitativo, calendário econômico e narrativas macro geradas por IA.",
  "macro.refresh": "Atualizar",
  "macro.my-assets": "Só meus ativos",
  "prop.title": "Contas",
  "prop.by-firm": "Por Firma",
  "reports.export-pdf": "Exportar PDF",
  "dexter.chat": "Chat",
  "dexter.coach": "Coach",
  "dexter.analyst": "Analyst",
  "dexter.unavailable": "Coach indisponível no momento. Tente novamente em alguns minutos.",
  "dexter.loading": "Pensando…",
  "dexter.placeholder": "Envie sua primeira mensagem ao Dexter.",
  "dayTimeline.subtitle": "Seus trades ao longo do dia (08:00–22:00 BRT). Tamanho da bolha = magnitude do PnL.",
  "dayTimeline.profit": "Lucro",
  "dayTimeline.loss": "Prejuízo",
  "dayTimeline.session": "Sessão de mercado (Londres / NY)",
  "dayTimeline.none": "Nenhum trade hoje ainda. Hora de observar antes de agir.",
  "macro.breaking.title": "Breaking — Alto Impacto",
  "macro.breaking.dismiss": "Dispensar",
  "macro.breaking.dismissFailed": "Não foi possível dispensar a notícia. Tente novamente.",
  "macro.breaking.loginRequired": "Faça login para dispensar notícias permanentemente.",
  "macro.breaking.connectionError": "Erro de conexão ao dispensar notícia.",
  "macro.sentiment.riskOn": "Risk On",
  "macro.sentiment.riskOff": "Risk Off",
  "macro.sentiment.neutral": "Neutro",
  "macro.sentiment.empty": "Sem dados de sentimento no momento.",
  "macro.sentiment.caption": "Fear & Greed · VIX",
  "macro.sentiment.crypto": "Crypto F&G",
  "macro.sentiment.stocks": "Stocks F&G",
  "macro.sentiment.vix": "VIX",
  "smartAlerts.dismissFailed": "Não foi possível dispensar o alerta. Tente novamente.",
};

const EN: Dict = {
  "journal.title": "Journal",
  "journal.subtitle": "Trade log and performance analysis.",
  "journal.add-trade": "Add Trade",
  "journal.show-values": "Show",
  "journal.hide-values": "Hide",
  "macro.title": "Macro Intelligence",
  "macro.subtitle": "Quantitative terminal, economic calendar, and AI-generated macro narratives.",
  "macro.refresh": "Refresh",
  "macro.my-assets": "Only my assets",
  "prop.title": "Accounts",
  "prop.by-firm": "By Firm",
  "reports.export-pdf": "Export PDF",
  "dexter.chat": "Chat",
  "dexter.coach": "Coach",
  "dexter.analyst": "Analyst",
  "dexter.unavailable": "Coach unavailable right now. Please try again in a few minutes.",
  "dexter.loading": "Thinking…",
  "dexter.placeholder": "Send Dexter your first message.",
  "dayTimeline.subtitle": "Your trades across the day (08:00–22:00 BRT). Bubble size = PnL magnitude.",
  "dayTimeline.profit": "Profit",
  "dayTimeline.loss": "Loss",
  "dayTimeline.session": "Market session (London / NY)",
  "dayTimeline.none": "No trades today yet. Time to observe before acting.",
  "macro.breaking.title": "Breaking — High Impact",
  "macro.breaking.dismiss": "Dismiss",
  "macro.breaking.dismissFailed": "Could not dismiss the news. Try again.",
  "macro.breaking.loginRequired": "Sign in to dismiss news permanently.",
  "macro.breaking.connectionError": "Connection error while dismissing news.",
  "macro.sentiment.riskOn": "Risk On",
  "macro.sentiment.riskOff": "Risk Off",
  "macro.sentiment.neutral": "Neutral",
  "macro.sentiment.empty": "No sentiment data right now.",
  "macro.sentiment.caption": "Fear & Greed · VIX",
  "macro.sentiment.crypto": "Crypto F&G",
  "macro.sentiment.stocks": "Stocks F&G",
  "macro.sentiment.vix": "VIX",
  "smartAlerts.dismissFailed": "Could not dismiss the alert. Try again.",
};

const DICTS: Record<AppLocale, Dict> = { pt: PT, en: EN };

export function tApp(locale: AppLocale, key: keyof typeof PT): string {
  const dict = DICTS[locale] ?? DICTS.pt;
  return dict[key] ?? PT[key] ?? String(key);
}

export type AppMessageKey = keyof typeof PT;
