import React, { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Fallback institucional quando não houver descrição. 4–5 linhas. Nunca "Consulte fontes oficiais".
const FALLBACK_DESCRICAO =
  'Este indicador é publicado por instituição oficial e entra nas séries de dados macroeconômicos. É usado como referência de condições da economia e do ciclo de negócios. Analistas e mercados o monitoram para contextualizar políticas e expectativas.';

// Remove mensagens técnicas e placeholders; manter apenas conteúdo institucional.
const stripTechnicalMessage = (text) => {
  if (!text || typeof text !== 'string') return text ?? '';
  return text
    .replace(/\s*Resultado divulgado em evento sensível à narrativa[^.]*\.?\s*/gi, '')
    .replace(/\s*Avaliar atualização do Panorama[^.]*\.?\s*/gi, '')
    .trim() || text;
};

// Mapa institucional FTMO: ticker → "Nome (TICKER)" para exibição.
const ATIVO_NOME_TICKER = {
  DXY: 'Índice Dólar (DXY)',
  EURUSD: 'Euro/Dólar (EURUSD)',
  GBPUSD: 'Libra/Dólar (GBPUSD)',
  USDJPY: 'Dólar/Iene (USDJPY)',
  USDCHF: 'Dólar/Franco (USDCHF)',
  AUDUSD: 'Dólar Australiano/Dólar (AUDUSD)',
  USDCAD: 'Dólar/Dólar Canadense (USDCAD)',
  XAUUSD: 'Ouro (XAUUSD)',
  XAGUSD: 'Prata (XAGUSD)',
  US30: 'Dow Jones (US30)',
  NAS100: 'NASDAQ 100 (NAS100)',
  SPX500: 'S&P 500 (SPX500)',
  BTCUSD: 'Bitcoin (BTCUSD)',
  EURJPY: 'Euro/Iene (EURJPY)',
  GBPJPY: 'Libra/Iene (GBPJPY)',
  EURAUD: 'Euro/Dólar Australiano (EURAUD)',
  AUDJPY: 'Dólar Australiano/Iene (AUDJPY)',
};

// Ativos sensíveis ao evento/moeda (principal + secundarios). Lista FTMO. Mapeamento estático, não probabilidade.
const getAtivosBeneficiados = (ativoBeneficiado) => {
  if (!ativoBeneficiado || typeof ativoBeneficiado !== 'object') return [];
  const out = [];
  if (ativoBeneficiado.principal && String(ativoBeneficiado.principal).trim()) {
    out.push(String(ativoBeneficiado.principal).trim());
  }
  if (Array.isArray(ativoBeneficiado.secundarios)) {
    ativoBeneficiado.secundarios.forEach((a) => {
      const s = String(a).trim();
      if (s && !out.includes(s)) out.push(s);
    });
  }
  return out;
};

const formatAtivoDisplay = (ticker) => ATIVO_NOME_TICKER[ticker] ?? ticker;

const EventCardExpanded = ({ event, token, openEventId, onExpandClick }) => {
  const [analysis, setAnalysis] = useState(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);

  // PROTEÇÃO DEFENSIVA: usar APENAS event_id canônico (backend é fonte da verdade)
  // Se event_id ausente, não fazer request e exibir aviso discreto
  const eventId = event?.event_id;
  
  if (!event) {
    console.warn("EventCardExpanded: evento não fornecido");
    return null;
  }
  
  if (!eventId) {
    // Evento sem event_id canônico: exibir aviso discreto, nunca disparar erro 500
    console.warn("EventCardExpanded: evento sem event_id canônico", event);
    return (
      <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
        <div className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-3 h-3 rounded-full ${event?.impact === 'HIGH' ? 'bg-red-600' : event?.impact === 'MEDIUM' ? 'bg-orange-500' : 'bg-yellow-500'}`} />
                <span className="px-2 py-1 rounded text-xs font-bold border bg-gray-500/20 text-gray-400 border-gray-500/50">
                  {event?.impact ?? '—'}
                </span>
              </div>
              <div className="mb-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-white font-bold text-lg">
                    {event?.currency ?? '—'}:
                  </span>
                  <span className="text-white text-base">
                    {event?.event ?? event?.name ?? event?.title ?? 'Evento sem nome'}
                  </span>
                </div>
              </div>
            </div>
            <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-2 flex-shrink-0">
              <p className="text-yellow-300 text-xs">⚠️ ID indisponível</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isExpanded = openEventId === eventId;

  // Rótulo visual do print — não é valor temporal. Nunca formatar, nunca converter.
  const label = event.print_time_label ?? event.time_raw ?? event.time;
  if (label != null && (typeof label !== 'string' || String(label).includes('Z') || String(label).includes('+'))) {
    throw new Error('Event label must be non-temporal string');
  }

  // PADRÃO OFICIAL FOREXFACTORY:
  // 🟡 AMARELO  = LOW IMPACT (yellow-500)
  // 🟠 LARANJA  = MEDIUM IMPACT (orange-500)
  // 🔴 VERMELHO = HIGH IMPACT (red-600)
  const getImpactColor = (impact) => {
    if (impact === 'HIGH') return 'bg-red-600';      // 🔴 VERMELHO
    if (impact === 'MEDIUM') return 'bg-orange-500'; // 🟠 LARANJA
    if (impact === 'LOW') return 'bg-yellow-500';    // 🟡 AMARELO
    return 'bg-gray-600';
  };

  const getImpactBadgeColor = (impact) => {
    if (impact === 'HIGH') return 'bg-red-500/20 text-red-400 border-red-500/50';           // 🔴 VERMELHO
    if (impact === 'MEDIUM') return 'bg-orange-500/20 text-orange-400 border-orange-500/50'; // 🟠 LARANJA
    if (impact === 'LOW') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';    // 🟡 AMARELO
    return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
  };

  const handleExpandClick = () => {
    const opening = openEventId !== eventId;
    onExpandClick?.(eventId);
    if (opening && analysis == null && !analysisError) {
      setLoadingAnalysis(true);
      setAnalysisError(null);
      fetch(`${API_BASE}/api/mrkt/event-analysis/${eventId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((r) => {
          if (!r.ok) {
            // Se não for 200, tratar como erro
            if (r.status === 400) {
              throw new Error(`ID de evento inválido: ${eventId}`);
            } else if (r.status === 404) {
              throw new Error(`Evento não encontrado: ${eventId}`);
            } else {
              throw new Error(`Erro HTTP ${r.status}: ${r.statusText}`);
            }
          }
          return r.json();
        })
        .then((data) => {
          if (data?.success && data?.analysis && typeof data.analysis === 'object') {
            setAnalysis(data.analysis);
            setAnalysisError(null);
          } else {
            setAnalysis(null);
            setAnalysisError('Análise não disponível para este evento.');
          }
        })
        .catch((err) => {
          console.warn('Erro ao buscar análise do evento:', err);
          setAnalysis(null);
          setAnalysisError(err?.message || 'Análise detalhada indisponível para este evento.');
        })
        .finally(() => setLoadingAnalysis(false));
    }
  };

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden hover:border-gray-600 transition-all">
      {/* Card Principal */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Info Principal */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-3 h-3 rounded-full ${getImpactColor(event?.impact)}`} />
              <span className={`px-2 py-1 rounded text-xs font-bold border ${getImpactBadgeColor(event?.impact)}`}>
                {event?.impact ?? '—'}
              </span>
            </div>

            <div className="mb-2">
              <div className="flex items-baseline gap-2">
                <span className="text-white font-bold text-lg">
                  {event?.currency ?? '—'}:
                </span>
                <span className="text-white text-base">
                  {event?.event ?? event?.name ?? event?.title ?? 'Evento sem nome'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm">
              {event?.print_time_label != null && String(event.print_time_label).trim() !== '' && (
                <span className="text-gray-400">
                  <span aria-hidden className="mr-1">⏰</span>
                  <span>{event.print_time_label}</span>
                </span>
              )}

              <div className="flex items-center gap-3">
                {event?.previous != null && String(event.previous).trim() !== '' && (
                  <span className="text-gray-400">
                    Prev: <span className="text-gray-300">{event.previous}</span>
                  </span>
                )}
                {event?.forecast != null && String(event.forecast).trim() !== '' && (
                  <span className="text-gray-400">
                    Ant: <span className="text-yellow-400">{event.forecast}</span>
                  </span>
                )}
                {event?.actual != null && String(event.actual).trim() !== '' ? (
                  <span className="text-gray-400">
                    Real: <span className="text-green-400">{event.actual}</span>
                  </span>
                ) : (
                  <span className="text-gray-500 italic">
                    Resultado ainda não divulgado
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Botão Análise do Evento — expansão inline (banner); colapso mútuo controlado por openEventId no pai */}
          <button
            onClick={handleExpandClick}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 flex-shrink-0"
          >
            <span>⚡</span>
            <span className="hidden sm:inline">Análise do Evento</span>
            <svg 
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Banner expansivo — somente via clique; ordem: Título → Contexto → Ativos (≥80%) */}
      {isExpanded && (
        <div className="border-t border-gray-700 bg-gray-900/50 p-4 transition-all ease-in-out">
          {loadingAnalysis ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto" />
              <p className="text-gray-400 mt-2 text-sm">Carregando análise...</p>
            </div>
          ) : analysisError ? (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-gray-300">Análise do Evento</h3>
              <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="text-yellow-400 text-xl">⚠️</span>
                  <div className="flex-1">
                    <p className="text-sm text-yellow-300 font-semibold mb-1">Análise indisponível</p>
                    <p className="text-xs text-yellow-400/80">{analysisError}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-gray-300">Análise do Evento</h3>

              {analysis?.context != null && String(analysis.context).trim() !== '' ? (
                <p className="text-sm text-gray-400 leading-relaxed">
                  {stripTechnicalMessage(analysis.context)}
                </p>
              ) : (
                <p className="text-sm text-gray-400 leading-relaxed">{FALLBACK_DESCRICAO}</p>
              )}

              <h4 className="text-sm font-bold text-gray-400 mt-3">Ativos sensíveis ao evento/moeda</h4>
              <p className="text-xs text-gray-500 mb-2 italic">
                Mapeamento estático de sensibilidade histórica por moeda/evento. Não é sinal.
              </p>
              {(() => {
                const fromEvent = Array.isArray(event?.favored_assets) ? event.favored_assets : [];
                const fromAnalysis = getAtivosBeneficiados(analysis?.ativo_beneficiado_evento);
                const raw = (fromEvent.length > 0 ? fromEvent : fromAnalysis) || [];
                const ativos = raw
                  .map((a) => String(a).trim())
                  .filter((a) => a);
                const unique = [...new Set(ativos)];

                if (unique.length === 0) {
                  return (
                    <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-3">
                      <p className="text-xs text-yellow-300">
                        ⚠️ Ativos favorecidos indisponíveis (contrato violado ou fonte incompleta).
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="flex flex-wrap gap-2">
                    {unique.map((ativo) => (
                      <span
                        key={ativo}
                        className="px-3 py-1.5 bg-purple-900/30 border border-purple-700/50 rounded-lg text-sm text-purple-200"
                      >
                        {formatAtivoDisplay(ativo)}
                      </span>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EventCardExpanded;