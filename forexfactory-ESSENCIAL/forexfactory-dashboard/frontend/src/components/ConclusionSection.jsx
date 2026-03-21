import React, { useState } from 'react';

const ConclusionSection = ({ conclusaoOperacional, cenarioBase, cenarioAlternativo, zonaRuido, distribuicaoProbabilidades, ativoDominanteSemana, ativosCorrelacionadosSemana, fluxoRisco }) => {
  const [expanded, setExpanded] = useState(false);

  if (!conclusaoOperacional || typeof conclusaoOperacional !== 'object') {
    return null;
  }

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-xl">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full bg-gradient-to-r from-green-600 to-teal-600 text-white py-3 px-5 transition-all flex items-center justify-between hover:from-green-700 hover:to-teal-700 group"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-lg">✅</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-base leading-tight">Perspectiva Semanal</div>
            <div className="text-xs text-white/80 leading-tight">Síntese e precificação de mercado</div>
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
        {conclusaoOperacional.sintese_semana && typeof conclusaoOperacional.sintese_semana === 'string' && conclusaoOperacional.sintese_semana.trim().length > 0 ? (
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">📋</span>
              <h3 className="text-sm font-semibold text-green-400">Síntese da Semana</h3>
            </div>
            <p className="text-gray-300 leading-relaxed whitespace-pre-line">
              {conclusaoOperacional.sintese_semana}
            </p>
          </div>
        ) : null}

        {conclusaoOperacional.precificacao_mercado && typeof conclusaoOperacional.precificacao_mercado === 'string' && conclusaoOperacional.precificacao_mercado.trim().length > 0 ? (
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">💹</span>
              <h3 className="text-sm font-semibold text-teal-400">Precificação de Mercado</h3>
            </div>
            <p className="text-gray-300 leading-relaxed whitespace-pre-line">
              {conclusaoOperacional.precificacao_mercado}
            </p>
          </div>
        ) : null}


        {(!conclusaoOperacional.sintese_semana || typeof conclusaoOperacional.sintese_semana !== 'string' || conclusaoOperacional.sintese_semana.trim().length === 0) &&
         (!conclusaoOperacional.precificacao_mercado || typeof conclusaoOperacional.precificacao_mercado !== 'string' || conclusaoOperacional.precificacao_mercado.trim().length === 0) &&
         !ativoDominanteSemana && (
          <div className="text-center py-8 text-gray-400 text-sm">
            Dados de conclusão não disponíveis
          </div>
        )}

        {/* Fase 3 - Controle Institucional */}
        {(cenarioBase || cenarioAlternativo || zonaRuido || distribuicaoProbabilidades) && (
          <div className="mt-6 pt-6 border-t border-gray-700">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-teal-400 mb-2">🎯 Controle Institucional (Fase 3)</h3>
            </div>
            
            <div className="space-y-4">
              {/* Cenário Base */}
              {cenarioBase && typeof cenarioBase === 'object' && (
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">📊</span>
                    <h4 className="text-sm font-semibold text-teal-400">Cenário Base</h4>
                  </div>
                  {cenarioBase.direcao && (
                    <div className="mb-2">
                      <span className={`px-3 py-1.5 rounded text-sm font-bold border ${
                        cenarioBase.direcao === 'Bullish' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                        cenarioBase.direcao === 'Bearish' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                        'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                      }`}>
                        {cenarioBase.direcao}
                      </span>
                    </div>
                  )}
                  {cenarioBase.ativos_beneficiados && Array.isArray(cenarioBase.ativos_beneficiados) && cenarioBase.ativos_beneficiados.length > 0 && (
                    <div className="mb-2">
                      <div className="text-xs text-gray-400 mb-1">Ativos Beneficiados:</div>
                      <div className="flex flex-wrap gap-2">
                        {cenarioBase.ativos_beneficiados.map((ativo, idx) => (
                          <span key={idx} className="px-2 py-1 bg-teal-800/30 rounded text-xs text-teal-300">
                            {ativo}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {cenarioBase.justificativa && (
                    <p className="text-gray-300 leading-relaxed whitespace-pre-line text-sm">
                      {cenarioBase.justificativa}
                    </p>
                  )}
                </div>
              )}

              {/* Cenário Alternativo */}
              {cenarioAlternativo && typeof cenarioAlternativo === 'object' && (
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">🔄</span>
                    <h4 className="text-sm font-semibold text-teal-400">Cenário Alternativo</h4>
                  </div>
                  {cenarioAlternativo.condicao_ativacao && (
                    <div className="mb-2">
                      <div className="text-xs text-gray-400 mb-1">Condição de Ativação:</div>
                      <p className="text-gray-300 text-sm font-medium">{cenarioAlternativo.condicao_ativacao}</p>
                    </div>
                  )}
                  {cenarioAlternativo.ativos_beneficiados && Array.isArray(cenarioAlternativo.ativos_beneficiados) && cenarioAlternativo.ativos_beneficiados.length > 0 && (
                    <div className="mb-2">
                      <div className="text-xs text-gray-400 mb-1">Ativos Beneficiados:</div>
                      <div className="flex flex-wrap gap-2">
                        {cenarioAlternativo.ativos_beneficiados.map((ativo, idx) => (
                          <span key={idx} className="px-2 py-1 bg-teal-800/30 rounded text-xs text-teal-300">
                            {ativo}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {cenarioAlternativo.justificativa && (
                    <p className="text-gray-300 leading-relaxed whitespace-pre-line text-sm">
                      {cenarioAlternativo.justificativa}
                    </p>
                  )}
                </div>
              )}

              {/* Zona de Ruído */}
              {zonaRuido && typeof zonaRuido === 'object' && (
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">⚠️</span>
                    <h4 className="text-sm font-semibold text-teal-400">Zona de Ruído</h4>
                  </div>
                  {zonaRuido.condicoes && (
                    <div className="mb-2">
                      <div className="text-xs text-gray-400 mb-1">Condições:</div>
                      <p className="text-gray-300 text-sm font-medium">{zonaRuido.condicoes}</p>
                    </div>
                  )}
                  {zonaRuido.ativos_evitar && Array.isArray(zonaRuido.ativos_evitar) && zonaRuido.ativos_evitar.length > 0 && (
                    <div className="mb-2">
                      <div className="text-xs text-gray-400 mb-1">Ativos a Evitar:</div>
                      <div className="flex flex-wrap gap-2">
                        {zonaRuido.ativos_evitar.map((ativo, idx) => (
                          <span key={idx} className="px-2 py-1 bg-red-800/30 rounded text-xs text-red-300">
                            {ativo}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {zonaRuido.justificativa && (
                    <p className="text-gray-300 leading-relaxed whitespace-pre-line text-sm">
                      {zonaRuido.justificativa}
                    </p>
                  )}
                </div>
              )}

              {/* Distribuição de Probabilidades */}
              {distribuicaoProbabilidades && typeof distribuicaoProbabilidades === 'object' && (
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">📈</span>
                    <h4 className="text-sm font-semibold text-teal-400">Distribuição de Probabilidades</h4>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">Cenário Base:</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-teal-500 h-2 rounded-full" 
                            style={{ width: `${distribuicaoProbabilidades.cenario_base || 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-bold text-teal-400 w-10 text-right">
                          {distribuicaoProbabilidades.cenario_base || 0}%
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">Cenário Alternativo:</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full" 
                            style={{ width: `${distribuicaoProbabilidades.cenario_alternativo || 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-bold text-blue-400 w-10 text-right">
                          {distribuicaoProbabilidades.cenario_alternativo || 0}%
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">Ruído:</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-yellow-500 h-2 rounded-full" 
                            style={{ width: `${distribuicaoProbabilidades.ruido || 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-bold text-yellow-400 w-10 text-right">
                          {distribuicaoProbabilidades.ruido || 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}


        </div>
      </div>
    </div>
  );
};

export default ConclusionSection;
