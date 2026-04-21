// Canonical voice tokens for wealth.Investing.
//
// Source of truth for microcopy consumed by Track B (landing) and Track C
// (authenticated app). Do not inline copy in components — import from here so
// personality and tone stay consistent across the product.
//
// Tone comes from BRAND.md §1 (essence) and §7 (voice):
//   - Preciso, não pedante. Confiante, não arrogante.
//   - Dados antes de opinião. Headline primeiro.
//   - Sem hype, sem jargão de guru, sem emoji de confete.
//
// Adding a new string? Keep it:
//   1. Single sentence where possible.
//   2. Specific. ("60 segundos" > "rápido")
//   3. Verb-first when it's a CTA. ("Conecte seu MT5" > "Clique aqui")
//   4. Bilingual (pt + en). pt is primary.

export type Locale = "pt" | "en";

export interface Bilingual {
  readonly pt: string;
  readonly en: string;
}

export const voice = {
  persona: {
    name: "Dexter",
    role: "analista sênior",
    traits: ["direto", "honesto", "preciso", "confiante"] as const,
    never: [
      "generalizações vazias",
      "promessas de lucro",
      "hype ou sensacionalismo",
      "jargão de guru",
      "emoji de confete",
    ] as const,
  },

  greetings: {
    morning: {
      pt: "Bom dia. Pronto pra sessão.",
      en: "Good morning. Ready for the session.",
    },
    afternoon: {
      pt: "Boa tarde. Mercado ainda aberto.",
      en: "Good afternoon. Markets still open.",
    },
    evening: {
      pt: "Boa noite. Sessão encerrada — bora revisar.",
      en: "Good evening. Session closed — let's review.",
    },
    weekend: {
      pt: "Mercado fechado. Bom momento pra revisar a semana.",
      en: "Markets closed. Good time to review the week.",
    },
  },

  cta: {
    connectMt5: {
      pt: "Conecte seu MT5 em 60 segundos",
      en: "Connect your MT5 in 60 seconds",
    },
    seeHow: {
      pt: "Ver como funciona",
      en: "See how it works",
    },
    upgradeUltra: {
      pt: "Desbloquear com Ultra",
      en: "Unlock with Ultra",
    },
    startFree: {
      pt: "Começar grátis",
      en: "Start free",
    },
    importTrades: {
      pt: "Importar trades",
      en: "Import trades",
    },
    reviewWeek: {
      pt: "Revisar a semana",
      en: "Review the week",
    },
  },

  loading: {
    analyzing: {
      pt: "Dexter está analisando...",
      en: "Dexter is analyzing...",
    },
    reading: {
      pt: "Lendo seu histórico...",
      en: "Reading your history...",
    },
    thinking: {
      pt: "Pensando...",
      en: "Thinking...",
    },
    crunching: {
      pt: "Rodando os números...",
      en: "Crunching the numbers...",
    },
  },

  errors: {
    dexterOffline: {
      pt: "Dexter está offline. Voltamos logo.",
      en: "Dexter is offline. Back shortly.",
    },
    mt5Failed: {
      pt: "Não consegui ler seu MT5. Vamos tentar de novo?",
      en: "Couldn't read your MT5. Try again?",
    },
    genericFallback: {
      pt: "Algo deu errado por aqui.",
      en: "Something went wrong on our side.",
    },
    rateLimited: {
      pt: "Você passou do limite do plano. Aguarde alguns minutos.",
      en: "You've hit the plan limit. Wait a few minutes.",
    },
    authExpired: {
      pt: "Sua sessão expirou. Entre de novo.",
      en: "Your session expired. Sign in again.",
    },
  },

  upgrade: {
    ultraGate: {
      pt: "Essa parte é dos Ultra. Quer entrar?",
      en: "This one is for Ultra members. Want in?",
    },
    ultraValue: {
      pt: "MT5 Live + Dexter 24/7 + relatórios semanais",
      en: "MT5 Live + Dexter 24/7 + weekly reports",
    },
    proGate: {
      pt: "Pro desbloqueia isso. Dá uma olhada?",
      en: "Pro unlocks this. Take a look?",
    },
    // Ultra primitives — consumed by <UltraBadge /> and <UltraLock />.
    // Keep short: the badge sits inline, the lock overlay is already dense.
    ultraBadge: {
      pt: "ULTRA",
      en: "ULTRA",
    },
    ultraLocked: {
      pt: "Ultra",
      en: "Ultra",
    },
    ultraLockedHint: {
      pt: "Desbloqueie com o plano Ultra.",
      en: "Unlock with the Ultra plan.",
    },
  },

  theme: {
    label: {
      pt: "Tema",
      en: "Theme",
    },
    light: {
      pt: "Claro",
      en: "Light",
    },
    terminal: {
      pt: "Terminal",
      en: "Terminal",
    },
    system: {
      pt: "Sistema",
      en: "System",
    },
  },

  // Empty states — when a surface has nothing to show yet.
  // Keep them actionable: always pair a state with a next step.
  empty: {
    noTrades: {
      pt: "Sem trades ainda. Importe seu primeiro MT5 pra começar.",
      en: "No trades yet. Import your first MT5 to get started.",
    },
    noAccounts: {
      pt: "Nenhuma conta conectada. Adicione uma prop ou pessoal.",
      en: "No accounts connected. Add a prop or personal account.",
    },
    noAlerts: {
      pt: "Sem alertas hoje. Mercado calmo — bora planejar a próxima.",
      en: "No alerts today. Markets calm — plan the next one.",
    },
    noJournalEntry: {
      pt: "Nenhuma nota nesse trade. Abra o editor e escreva a sua leitura.",
      en: "No notes on this trade. Open the editor and write your read.",
    },
  },

  // Success confirmations — short, specific, no exclamation marks.
  success: {
    importDone: {
      pt: "Trades importados. Conferindo duplicatas agora.",
      en: "Trades imported. Checking duplicates now.",
    },
    saved: {
      pt: "Salvo.",
      en: "Saved.",
    },
    connected: {
      pt: "Conta conectada.",
      en: "Account connected.",
    },
    accountSwitched: {
      pt: "Conta ativa trocada.",
      en: "Active account switched.",
    },
  },

  // Destructive / irreversible confirmations — be explicit about what is lost.
  confirm: {
    deleteTrade: {
      pt: "Apagar esse trade? Não dá pra desfazer.",
      en: "Delete this trade? Can't be undone.",
    },
    discardChanges: {
      pt: "Descartar alterações?",
      en: "Discard changes?",
    },
    disconnectAccount: {
      pt: "Desconectar conta? Trades já importados ficam; o sync para.",
      en: "Disconnect account? Imported trades stay; sync stops.",
    },
  },

  // Onboarding nudges — for new-user flows. Each string points at one action.
  onboarding: {
    welcome: {
      pt: "Bem-vindo. Dexter está pronto — só falta conectar seu MT5.",
      en: "Welcome. Dexter is ready — just connect your MT5.",
    },
    nextStep: {
      pt: "Próximo passo:",
      en: "Next step:",
    },
    skipForNow: {
      pt: "Pular por enquanto",
      en: "Skip for now",
    },
  },

  // Nav hints — short tooltips on sidebar items. One line, no period.
  nav: {
    dashboard: {
      pt: "Visão geral do dia",
      en: "Today at a glance",
    },
    journal: {
      pt: "Histórico e leitura dos trades",
      en: "History and trade notes",
    },
    macro: {
      pt: "Calendário econômico e contexto",
      en: "Economic calendar and context",
    },
    ai: {
      pt: "Converse com Dexter",
      en: "Talk to Dexter",
    },
    settings: {
      pt: "Contas, plano e preferências",
      en: "Accounts, plan and preferences",
    },
  },

  // Operational rules — consumed by linters, reviewers, and copy generators.
  // Do not treat as UI strings.
  rules: {
    concise: true,
    ptPronoun: "você" as const,
    allowEmojis: false,
    numbersFormatted: true,
    headlineFirst: true,
  },
} as const;

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

/** Pick the string for the given locale from a bilingual entry. */
export function pick(entry: Bilingual, locale: Locale): string {
  return entry[locale];
}

/**
 * Return the time-of-day greeting for the given locale.
 * Weekend (Sat/Sun) wins regardless of hour.
 * Morning: 5–11, Afternoon: 12–17, Evening: 18–4.
 */
export function getGreeting(locale: Locale, date: Date = new Date()): string {
  const day = date.getDay(); // 0 = Sun, 6 = Sat
  if (day === 0 || day === 6) return pick(voice.greetings.weekend, locale);
  const h = date.getHours();
  if (h >= 5 && h < 12) return pick(voice.greetings.morning, locale);
  if (h >= 12 && h < 18) return pick(voice.greetings.afternoon, locale);
  return pick(voice.greetings.evening, locale);
}

/** Sugar over pick() for CTA lookups — common enough to justify its own fn. */
export function cta(key: keyof typeof voice.cta, locale: Locale): string {
  return pick(voice.cta[key], locale);
}
