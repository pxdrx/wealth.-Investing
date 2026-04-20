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
