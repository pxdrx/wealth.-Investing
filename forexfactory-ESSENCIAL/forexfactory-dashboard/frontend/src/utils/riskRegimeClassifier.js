/**
 * FUNÇÃO ÚNICA DE CLASSIFICAÇÃO DE RISCO
 * 
 * Esta é a única fonte da verdade para classificação de regime de risco.
 * Combina Fear & Greed Index e VIX Index para produzir um veredito claro e institucional.
 * 
 * Regras determinísticas:
 * - Risk-Off: Fear & Greed ≤ 40 E VIX ≥ 20
 * - Risk-On: Fear & Greed ≥ 60 E VIX ≤ 18
 * - Risk-On (Transição): Fear & Greed ≥ 60 mas VIX > 18 (Risk-On com elementos de transição)
 * - Risk-Off (Transição): Fear & Greed ≤ 40 mas VIX < 20 (Risk-Off com elementos de transição)
 * - Transição: Qualquer outro cenário (Fear & Greed entre 40-60 ou VIX entre 18-20)
 * 
 * @param {number|null} fearGreed - Valor do Fear & Greed Index (0-100) ou null
 * @param {number|null} vix - Valor do VIX Index ou null
 * @returns {object} - { label, color, icon, subtitle }
 */
export const deriveRiskRegime = ({ fearGreed, vix }) => {
  // Validação defensiva: se valores não disponíveis, retornar "Indisponível"
  if (fearGreed === null || fearGreed === undefined || typeof fearGreed !== 'number') {
    return {
      label: "INDISPONÍVEL",
      color: "gray",
      icon: "⚪",
      subtitle: "Classificação indisponível: dados de Fear & Greed Index não disponíveis.",
    };
  }
  
  if (vix === null || vix === undefined || typeof vix !== 'number') {
    return {
      label: "INDISPONÍVEL",
      color: "gray",
      icon: "⚪",
      subtitle: "Classificação indisponível: dados de VIX Index não disponíveis.",
    };
  }

  // Risk-Off claro: Fear ≤ 40 E VIX ≥ 20
  if (fearGreed <= 40 && vix >= 20) {
    return {
      label: "RISK-OFF",
      color: "red",
      icon: "🔴",
      subtitle: "Classificação derivada da combinação Fear & Greed + VIX. Indicador de contexto macro, não sinal.",
    };
  }

  // Risk-On claro: Fear ≥ 60 E VIX ≤ 18
  if (fearGreed >= 60 && vix <= 18) {
    return {
      label: "RISK-ON",
      color: "green",
      icon: "🟢",
      subtitle: "Classificação derivada da combinação Fear & Greed + VIX. Indicador de contexto macro, não sinal.",
    };
  }

  // Risk-On com transição: Fear ≥ 60 mas VIX > 18
  if (fearGreed >= 60 && vix > 18) {
    return {
      label: "RISK-ON (TRANSIÇÃO)",
      color: "green-yellow",
      icon: "🟢",
      subtitle: "Classificação derivada da combinação Fear & Greed + VIX. Indicador de contexto macro, não sinal.",
    };
  }

  // Risk-Off com transição: Fear ≤ 40 mas VIX < 20
  if (fearGreed <= 40 && vix < 20) {
    return {
      label: "RISK-OFF (TRANSIÇÃO)",
      color: "red-yellow",
      icon: "🔴",
      subtitle: "Classificação derivada da combinação Fear & Greed + VIX. Indicador de contexto macro, não sinal.",
    };
  }

  // Transição neutra: Fear entre 40-60 ou VIX entre 18-20
  return {
    label: "TRANSIÇÃO",
    color: "yellow",
    icon: "🟡",
    subtitle: "Classificação derivada da combinação Fear & Greed + VIX. Indicador de contexto macro, não sinal.",
  };
};

/**
 * Retorna configuração visual completa para o regime de risco derivado.
 * 
 * @param {object} regimeResult - Resultado de deriveRiskRegime()
 * @returns {object} - { icon, label, colorClass, bgClass, borderClass, subtitle }
 */
export const getRiskRegimeDisplayConfig = (regimeResult) => {
  if (!regimeResult || !regimeResult.color) {
    return {
      icon: "⚪",
      label: "INDISPONÍVEL",
      colorClass: "text-gray-400",
      bgClass: "bg-gray-500/20",
      borderClass: "border-gray-500/50",
      subtitle: "Classificação indisponível no momento.",
    };
  }

  const { color, icon, label, subtitle } = regimeResult;

  switch (color) {
    case "red":
      return {
        icon,
        label,
        colorClass: "text-red-400",
        bgClass: "bg-red-500/20",
        borderClass: "border-red-500/50",
        subtitle,
      };
    case "green":
      return {
        icon,
        label,
        colorClass: "text-green-400",
        bgClass: "bg-green-500/20",
        borderClass: "border-green-500/50",
        subtitle,
      };
    case "green-yellow":
      return {
        icon,
        label,
        colorClass: "text-green-300",
        bgClass: "bg-green-500/15",
        borderClass: "border-green-500/40 border-yellow-500/40",
        subtitle,
      };
    case "red-yellow":
      return {
        icon,
        label,
        colorClass: "text-red-300",
        bgClass: "bg-red-500/15",
        borderClass: "border-red-500/40 border-yellow-500/40",
        subtitle,
      };
    case "yellow":
    default:
      return {
        icon,
        label,
        colorClass: "text-yellow-400",
        bgClass: "bg-yellow-500/20",
        borderClass: "border-yellow-500/50",
        subtitle,
      };
  }
};

// Compatibilidade: manter funções antigas para não quebrar código existente
// (mas devem ser migradas para deriveRiskRegime)
export const classifyRiskRegime = (fearGreedValue, vixValue) => {
  const result = deriveRiskRegime({ fearGreed: fearGreedValue, vix: vixValue });
  // Mapear para formato antigo
  if (result.label === "RISK-OFF" || result.label === "RISK-OFF (TRANSIÇÃO)") return "Risk-Off";
  if (result.label === "RISK-ON" || result.label === "RISK-ON (TRANSIÇÃO)") return "Risk-On";
  return "Transição";
};

export const getRiskRegimeConfig = (regime) => {
  // Mapear formato antigo para novo
  const fearGreed = regime === "Risk-Off" ? 30 : regime === "Risk-On" ? 70 : 50;
  const vix = regime === "Risk-Off" ? 25 : regime === "Risk-On" ? 15 : 19;
  const result = deriveRiskRegime({ fearGreed, vix });
  return getRiskRegimeDisplayConfig(result);
};
