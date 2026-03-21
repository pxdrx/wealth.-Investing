import React, { useState } from 'react';

const DecisionIntelligenceSection = ({ 
  ativosDaSemana,
  direcionamentoSemanal, 
  interpretacaoNarrativaAtivo, 
  fluxoRisco 
}) => {
  const [expanded, setExpanded] = useState(false);

  // Default seguro: sempre garantir que ativosDaSemana existe
  const ativos = ativosDaSemana ?? {
    status: "unavailable",
    items: [],
    reason: "Dados indisponíveis",
    fallback: {
      symbol: "DXY",
      label: "Dólar (DXY)",
      context: "Fallback institucional para monitoramento."
    }
  };

  const getRiskFlowColor = (classification) => {
    if (!classification) return 'text-gray-400';
    switch (classification.toLowerCase()) {
      case 'risk-on':
        return 'text-green-400';
      case 'risk-off':
        return 'text-red-400';
      case 'rotacional':
        return 'text-blue-400';
      default:
        return 'text-gray-400';
    }
  };

  const getRiskFlowBgColor = (classification) => {
    if (!classification) return 'bg-gray-500/20 border-gray-500/30';
    switch (classification.toLowerCase()) {
      case 'risk-on':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'risk-off':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'rotacional':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-xl">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-5 transition-all flex items-center justify-between hover:from-indigo-700 hover:to-purple-700 group"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-lg">🎯</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-base leading-tight flex items-center gap-2">
              <span>Ativos da Semana</span>
              <span className="text-xs font-normal opacity-70" title="Lista de monitoramento (editorial). Prioriza atenção, não é sinal.">
                📝 Editorial
              </span>
            </div>
            <div className="text-xs text-white/80 leading-tight">Lista de monitoramento (editorial). Prioriza atenção, não é sinal.</div>
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
          
          {/* Ativos da Semana — lista de monitoramento editorial */}
          {(() => {
            // Usar ativos já normalizado com default seguro (definido no topo do componente)
            const status = ativos?.status || "unavailable";
            const items = Array.isArray(ativos?.items) ? ativos.items : [];
            const reason = ativos?.reason || "";
            const fallback = ativos?.fallback || {symbol: "DXY", label: "Dólar (DXY)", context: "Fallback institucional."};
            
            // Se unavailable, mostrar mensagem e fallback
            if (status === "unavailable") {
              return (
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">⭐</span>
                    <h3 className="text-sm font-semibold text-indigo-400">Ativos da Semana</h3>
                    <span className="text-xs text-gray-500 ml-auto" title="Editorial (manual). Não é sinal.">
                      📝 Editorial
                    </span>
                  </div>
                  {reason && (
                    <div className="mb-3 bg-amber-900/20 rounded-lg p-3 border border-amber-700/50">
                      <p className="text-amber-200 text-xs">
                        Indisponível: {reason}
                      </p>
                    </div>
                  )}
                  {/* Fallback DXY */}
                  <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50">
                    <div className="mb-2">
                      <span className="text-base font-bold text-white">{fallback.label || fallback.symbol}</span>
                      <span className="ml-2 text-xs text-gray-500">(Fallback)</span>
                    </div>
                    {fallback.context && (
                      <p className="text-gray-400 text-xs italic">
                        {fallback.context}
                      </p>
                    )}
                  </div>
                </div>
              );
            }
            
            // Se ok mas sem items, mostrar fallback
            if (items.length === 0) {
              return (
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">⭐</span>
                    <h3 className="text-sm font-semibold text-indigo-400">Ativos da Semana</h3>
                    <span className="text-xs text-gray-500 ml-auto" title="Editorial (manual). Não é sinal.">
                      📝 Editorial
                    </span>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50">
                    <div className="mb-2">
                      <span className="text-base font-bold text-white">{fallback.label || fallback.symbol}</span>
                      <span className="ml-2 text-xs text-gray-500">(Fallback)</span>
                    </div>
                    {fallback.context && (
                      <p className="text-gray-400 text-xs italic">
                        {fallback.context}
                      </p>
                    )}
                  </div>
                </div>
              );
            }
            
            // Renderizar items
            return (
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">⭐</span>
                  <h3 className="text-sm font-semibold text-indigo-400">Ativos em Destaque</h3>
                  <span className="text-xs text-gray-500 ml-auto" title="Editorial (manual). Não é sinal.">
                    📝 Editorial
                  </span>
                </div>
                <div className="space-y-3">
                  {items.length > 0 ? (
                    items.map((item, idx) => {
                      // Fail-safe: garantir que item existe e tem propriedades válidas
                      if (!item || typeof item !== 'object') return null;
                      const itemLabel = item.label || item.symbol || 'Ativo';
                      const itemContext = item.context && typeof item.context === 'string' ? item.context.trim() : null;
                      
                      return (
                        <div key={idx} className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50">
                          <div className="mb-2">
                            <span className="text-base font-bold text-white">{itemLabel}</span>
                          </div>
                          {itemContext && itemContext.length > 0 && (
                            <p className="text-gray-300 leading-relaxed whitespace-pre-line text-xs">
                              {itemContext}
                            </p>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    // Fallback se items vazio mesmo com status ok
                    <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50">
                      <div className="mb-2">
                        <span className="text-base font-bold text-white">{fallback.label || fallback.symbol}</span>
                        <span className="ml-2 text-xs text-gray-500">(Fallback)</span>
                      </div>
                      {fallback.context && (
                        <p className="text-gray-400 text-xs italic">
                          {fallback.context}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Interpretação da Narrativa */}
          {interpretacaoNarrativaAtivo && typeof interpretacaoNarrativaAtivo === 'string' && interpretacaoNarrativaAtivo.trim().length > 0 && (
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">📝</span>
                <h3 className="text-sm font-semibold text-indigo-400">Interpretação da Narrativa</h3>
              </div>
              <p className="text-gray-300 leading-relaxed whitespace-pre-line text-sm">
                {interpretacaoNarrativaAtivo}
              </p>
            </div>
          )}

          {/* Fluxo de Risco */}
          {fluxoRisco && typeof fluxoRisco === 'object' && (
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">🌊</span>
                <h3 className="text-sm font-semibold text-indigo-400">Fluxo de Risco (Risk Flow)</h3>
              </div>
              {fluxoRisco.classificacao && (
                <div className="mb-3">
                  <span className={`px-3 py-1.5 rounded text-sm font-bold border ${getRiskFlowBgColor(fluxoRisco.classificacao)}`}>
                    {fluxoRisco.classificacao}
                  </span>
                </div>
              )}
              {fluxoRisco.ativos_migracao && (
                <div className="mb-3">
                  <div className="text-xs text-gray-400 mb-1">Ativos de Migração de Capital:</div>
                  <p className="text-gray-300 text-sm font-medium">{fluxoRisco.ativos_migracao}</p>
                </div>
              )}
              {fluxoRisco.justificativa && (
                <p className="text-gray-300 leading-relaxed whitespace-pre-line text-sm">
                  {fluxoRisco.justificativa}
                </p>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default DecisionIntelligenceSection;
