import React, { useState } from 'react';
import { classifyRiskRegime } from '../utils/riskRegime';

const NarrativeSection = ({ interpretacaoNarrativa, fearGreedValue, vixValue }) => {
  const [expanded, setExpanded] = useState(false);

  if (!interpretacaoNarrativa || typeof interpretacaoNarrativa !== 'object') {
    return null;
  }

  const sections = [
    {
      key: 'politica_monetaria',
      label: 'Política Monetária',
      icon: '🏦',
      value: interpretacaoNarrativa.politica_monetaria || null,
    },
    {
      key: 'crescimento_economico',
      label: 'Crescimento Econômico',
      icon: '📈',
      value: interpretacaoNarrativa.crescimento_economico || null,
    },
    {
      key: 'inflacao_pressoes',
      label: 'Inflação e Pressões de Preços',
      icon: '💰',
      value: interpretacaoNarrativa.inflacao_pressoes || null,
    },
    {
      key: 'risco_apetite',
      label: 'Risco e Apetite de Mercado',
      icon: '⚡',
      value: interpretacaoNarrativa.risco_apetite || null,
    },
  ].filter(section => section.value && typeof section.value === 'string' && section.value.trim().length > 0);

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-xl">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 px-5 transition-all flex items-center justify-between hover:from-purple-700 hover:to-indigo-700 group"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-lg">📝</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-base leading-tight">Interpretação Narrativa</div>
            <div className="text-xs text-white/80 leading-tight">Análise macroeconômica institucional</div>
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
          {sections.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              Dados narrativos não disponíveis
            </div>
          ) : (
            sections.map((section) => {
              const displayValue = typeof section.value === 'string' ? section.value : String(section.value || '');
              
              // Classificação de regime de risco para o bloco "Risco e apetite de mercado"
              const isRiskSection = section.key === 'risco_apetite';
              
              // FUNÇÃO ÚNICA: classifyRiskRegime é a única fonte da verdade
              // Normalização defensiva: garantir que valores existem antes de classificar
              const safeFearGreed = fearGreedValue !== null && fearGreedValue !== undefined ? fearGreedValue : null;
              const safeVix = vixValue !== null && vixValue !== undefined ? vixValue : null;
              
              // Usar função única para classificar regime (sempre retorna objeto, mesmo se dados indisponíveis)
              const riskRegime = isRiskSection ? classifyRiskRegime({ fearGreed: safeFearGreed, vix: safeVix }) : null;

              return (
                <div
                  key={section.key}
                  className="bg-gray-800/50 rounded-lg p-4 border border-gray-700"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{section.icon}</span>
                    <h3 className="text-sm font-semibold text-purple-400">{section.label}</h3>
                  </div>
                  
                  {/* Badge de regime de risco (apenas para "Risco e apetite de mercado") */}
                  {isRiskSection && (
                    <>
                      {riskRegime ? (
                        <div className={`rounded-lg p-4 mb-3 border ${
                          riskRegime.color === 'green' ? 'bg-green-500/20 border-green-500/50' :
                          riskRegime.color === 'red' ? 'bg-red-500/20 border-red-500/50' :
                          riskRegime.color === 'yellow' ? 'bg-yellow-500/20 border-yellow-500/50' :
                          'bg-gray-500/20 border-gray-500/50'
                        }`}>
                          <div className="mb-2">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-2xl">{riskRegime.icon}</span>
                              <span className={`text-xl font-bold ${
                                riskRegime.color === 'green' ? 'text-green-400' :
                                riskRegime.color === 'red' ? 'text-red-400' :
                                riskRegime.color === 'yellow' ? 'text-yellow-400' :
                                'text-gray-400'
                              }`}>
                                Regime de Mercado da Semana: {riskRegime.label}
                              </span>
                            </div>
                            <p className="text-gray-300 text-xs leading-relaxed mt-2">
                              {riskRegime.description}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-800/50 rounded-lg p-3 mb-3 border border-gray-700">
                          <p className="text-gray-400 text-xs leading-relaxed">
                            Regime de risco indisponível no momento.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                  
                  <p className="text-gray-300 leading-relaxed whitespace-pre-line">
                    {displayValue}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default NarrativeSection;
