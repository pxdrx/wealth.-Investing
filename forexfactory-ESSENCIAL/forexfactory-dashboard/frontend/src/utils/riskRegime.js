/**
 * FUNÇÃO ÚNICA DE CLASSIFICAÇÃO DE RISCO
 * 
 * Esta é a única fonte da verdade para classificação de regime de risco.
 * Combina Fear & Greed Index e VIX Index para produzir um veredito claro e institucional.
 * 
 * Regras determinísticas:
 * - RISK-ON: Fear & Greed ≥ 60 E VIX < 18
 * - RISK-OFF: Fear & Greed ≤ 40 E VIX > 25
 * - TRANSIÇÃO: Qualquer outro cenário
 * - NEUTRO: Dados insuficientes
 */

export function classifyRiskRegime({ fearGreed, vix }) {
  // Validação defensiva: dados insuficientes
  if (fearGreed == null || vix == null) {
    return {
      label: "NEUTRO",
      color: "gray",
      icon: "⚪",
      description: "Dados insuficientes para classificação do regime de risco."
    };
  }

  // Validação de tipo: garantir que são números
  if (typeof fearGreed !== 'number' || typeof vix !== 'number') {
    return {
      label: "NEUTRO",
      color: "gray",
      icon: "⚪",
      description: "Dados insuficientes para classificação do regime de risco."
    };
  }

  // RISK-ON: Fear & Greed ≥ 60 E VIX < 18
  if (fearGreed >= 60 && vix < 18) {
    return {
      label: "RISK-ON",
      color: "green",
      icon: "🟢",
      description: "Apetite por risco elevado, volatilidade contida."
    };
  }

  // RISK-OFF: Fear & Greed ≤ 40 E VIX > 25
  if (fearGreed <= 40 && vix > 25) {
    return {
      label: "RISK-OFF",
      color: "red",
      icon: "🔴",
      description: "Aversão ao risco elevada, volatilidade alta."
    };
  }

  // TRANSIÇÃO: qualquer outro cenário
  return {
    label: "TRANSIÇÃO",
    color: "yellow",
    icon: "🟡",
    description: "Mercado em transição entre regimes de risco."
  };
}
