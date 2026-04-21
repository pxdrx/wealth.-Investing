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
};

const DICTS: Record<AppLocale, Dict> = { pt: PT, en: EN };

export function tApp(locale: AppLocale, key: keyof typeof PT): string {
  const dict = DICTS[locale] ?? DICTS.pt;
  return dict[key] ?? PT[key] ?? String(key);
}

export type AppMessageKey = keyof typeof PT;
