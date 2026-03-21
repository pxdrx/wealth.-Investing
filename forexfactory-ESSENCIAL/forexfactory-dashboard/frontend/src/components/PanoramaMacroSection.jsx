import React, { useState } from 'react';

const PanoramaMacroSection = ({ macroOverview, children }) => {
  const [expanded, setExpanded] = useState(false);

  // Blindagem total: sempre assumir que macro_overview existe
  const macro = macroOverview ?? {
    status: "unavailable",
    reason: "dados não disponíveis",
    summary: "",
    themes: [],
    macro_regime: "NEUTRAL",
  };

  // Normalizar campos com fallbacks defensivos
  const summary = macro.summary || "";
  const themes = Array.isArray(macro.themes) ? macro.themes : [];
  const macroRegime = macro.macro_regime; // Não usar fallback - None significa não configurado

  // Mapeamento visual do regime (apenas se configurado manualmente)
  const regimeConfig = macroRegime === "RISK_OFF" || macroRegime === "DEFENSIVE"
    ? { icon: "🔴", label: "Risk-Off", description: "Ambiente defensivo, sensível a dados macro", source: macro.regime_source || "Editorial" }
    : macroRegime === "RISK_ON"
    ? { icon: "🟢", label: "Risk-On", description: "Ambiente de risco, favorável a ativos de risco", source: macro.regime_source || "Editorial" }
    : null; // Não exibir se não configurado (None)

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-lg" data-testid="panorama-banner">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-4 px-6 transition-all flex items-center justify-between hover:from-indigo-700 hover:to-blue-700 group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">⚖️</span>
          </div>
          <div className="flex-1 min-w-0 text-left">
            <h2 className="text-xl font-bold leading-tight">Panorama Macro Semanal</h2>
            <div className="text-sm text-white/80 leading-tight mt-1">
              Narrativa sujeita a alteração dependendo do resultado de eventos de alto impacto macroeconômicos.
            </div>
          </div>
        </div>
        <svg
          className={`w-6 h-6 transition-transform duration-300 flex-shrink-0 ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          expanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="p-6 bg-gray-950 space-y-4">

          {/* Summary - renderiza apenas se houver conteúdo */}
          {summary && summary.trim() && (
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">📋</span>
                <h3 className="text-sm font-semibold text-indigo-400">Resumo Macro</h3>
              </div>
              <p className="text-gray-300 leading-relaxed whitespace-pre-line text-sm">
                {summary}
              </p>
            </div>
          )}

          {/* Regime Macro - renderiza apenas se configurado manualmente */}
          {regimeConfig && (
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{regimeConfig.icon}</span>
                <h3 className="text-sm font-semibold text-indigo-400">Regime Macro</h3>
                {regimeConfig.source && (
                  <span className="text-xs text-gray-500 ml-auto" title={`Fonte editorial: ${regimeConfig.source}`}>
                    Editorial
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white">{regimeConfig.label}</span>
                <span className="text-gray-400 text-sm">— {regimeConfig.description}</span>
              </div>
            </div>
          )}

          {/* Temas Dominantes - renderiza se houver */}
          {themes.length > 0 && (
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">🎯</span>
                <h3 className="text-sm font-semibold text-indigo-400">Temas Dominantes</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {themes.map((theme, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 bg-indigo-500/20 text-indigo-300 rounded-lg border border-indigo-500/30 text-xs font-medium"
                  >
                    {theme}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Banners filhos: Análise Macro Regional, Interpretação Narrativa, Análise de Ativos, Ativos da Semana */}
          {children && (
            <div className="space-y-4 mt-6">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PanoramaMacroSection;
