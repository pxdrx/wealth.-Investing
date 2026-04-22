/**
 * Interpretation layer for the "Sentimento Global" card.
 *
 * Pure lookup — given an overall risk classification and a trend vs the prior
 * period, return a 1-line headline + 1-line compensation sentence in PT-BR.
 */

export type Overall = "risk_on" | "neutral" | "risk_off";
export type Trend = "improving" | "deteriorating" | "stable";

export interface Reading {
  headline: string;
  compensation: string;
}

const READINGS: Record<Overall, Record<Trend, Reading>> = {
  risk_on: {
    improving: {
      headline: "Momentum risk-on firme e acelerando.",
      compensation: "Favorece: ações growth, índices, crypto de beta alto.",
    },
    stable: {
      headline: "Apetite por risco saudável, sem inflexão.",
      compensation: "Favorece: exposição direcional em índices e growth.",
    },
    deteriorating: {
      headline: "Risk-on perdendo força, mercado pode virar.",
      compensation: "Reduzir beta alto gradual. Observar VIX.",
    },
  },
  neutral: {
    improving: {
      headline: "Mercado saindo de indecisão, viés positivo.",
      compensation: "Favorece: aumento gradual em growth e cíclicos.",
    },
    stable: {
      headline: "Mercado indeciso, sem direção clara.",
      compensation: "Neutro: manter exposição balanceada.",
    },
    deteriorating: {
      headline: "Otimismo evaporando, cautela crescente.",
      compensation: "Reduzir beta. Priorizar qualidade.",
    },
  },
  risk_off: {
    improving: {
      headline: "Stress diminuindo, começo de recuperação.",
      compensation: "Observar. Aumento tático em índices se confirmar.",
    },
    stable: {
      headline: "Ambiente de aversão a risco persistente.",
      compensation: "Favorece: defensivos, USD, cash, bonds curtos.",
    },
    deteriorating: {
      headline: "Stress agudo. VIX elevado.",
      compensation: "Cautela extrema. Cash e defensivos. Evitar beta alto.",
    },
  },
};

export function interpret(overall: Overall, trend: Trend): Reading {
  return READINGS[overall]?.[trend] ?? READINGS.neutral.stable;
}
