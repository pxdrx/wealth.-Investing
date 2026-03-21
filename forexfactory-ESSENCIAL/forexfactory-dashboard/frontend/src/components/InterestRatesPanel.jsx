import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, Info, Maximize2 } from 'lucide-react';
import AnalysisModal from './AnalysisModal';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

// Análise macro por Banco Central — impacto e contexto, máx. 5 linhas cada. Linguagem institucional, objetiva.
// Fallback: bank.impact / bank.description quando o código não estiver no mapa.
const ANALYSE_BY_BANK = {
  FED: {
    impacto: 'Decisões da FED tendem a impactar índices acionários globais (S&P 500, Nasdaq) e o DXY. O dólar pode fortalecer em cenário de manutenção ou alta de juros. Ouro e prata podem reagir à liquidez e expectativas de cortes. Criptomoedas costumam ser sensíveis ao apetite a risco e à liquidez em USD.',
    contexto: 'FED manteve taxas em faixa de 3,5%–3,75% após corte de 25 pb em dezembro. Comunicado sinaliza dependência de dados. Inflação core ainda acima da meta; emprego resiliente. Próximas decisões condicionadas a NFP, CPI e PCE.',
  },
  ECB: {
    impacto: 'Posicionamento do BCE pode pressionar ou favorecer índices europeus e o EUR em pares de FX. Euro tende a reagir a expectativas de cortes e ao diferencial de juros com o dólar. Metais e cripto acompanham liquidez global e fluxo de risco.',
    contexto: 'BCE em 2% desde dezembro; comunicação mantém tom cauteloso. Inflação na zona do euro em desaceleração; atividade moderada. Dados de PIB e PMI determinam o ritmo dos próximos ajustes.',
  },
  BOE: {
    impacto: 'Guidance do BoE pode influenciar FTSE e par GBPUSD. Libra sensível a expectativas de cortes e ao spread de juros versus Fed e BCE. Ouro e prata podem reagir a alterações na liquidez global. Cripto acompanha apetite a risco.',
    contexto: 'BoE em 3,75% após corte de 25 pb. Inflação em trajetória de queda; mercado de trabalho segue resiliente. Comunicação indica dependência de dados para próximas decisões.',
  },
  BOJ: {
    impacto: 'Decisões do BOJ podem impactar Nikkei e par USD/JPY. Iene tende a fortalecer em cenário de alta de juros ou redução de estímulos. Metais e cripto acompanham fluxo de liquidez em JPY e apetite a risco na Ásia.',
    contexto: 'BOJ elevou taxa para 0,75% (máximo em décadas). CPI em Tóquio em desaceleração; crescimento moderado. Comunicação mantém tom cauteloso sobre normalização adicional.',
  },
  BCB: {
    impacto: 'Trajetória do BCB pode influenciar Ibovespa e pares com BRL. Real sensível a expectativas de cortes e ao diferencial de juros. Ouro e prata acompanham demanda de reserva e liquidez. Cripto reflete fluxo de risco local e global.',
    contexto: 'BCB mantém Selic em 15%; comunicação sinaliza afrouxamento gradual. Inflação em queda; atividade e emprego determinam o ritmo. Maior taxa de juros real entre os principais BCs.',
  },
  BOC: {
    impacto: 'Comunicação do BOC pode influenciar índices canadenses e USDCAD. Dólar canadense tende a reagir a expectativas de cortes e ao preço do petróleo. Metais e cripto acompanham liquidez e apetite a risco.',
    contexto: 'BOC em pausa em 2,25%; última decisão sem alteração. Inflação em desaceleração; mercado de trabalho equilibrado. Guidance dependente de dados macro e evolução do PIB.',
  },
  RBA: {
    impacto: 'Posicionamento do RBA pode pressionar ou favorecer ASX e AUD em pares de FX. Dólar australiano sensível a commodities e diferencial de juros. Metais e cripto acompanham liquidez e fluxo de risco na região Ásia-Pacífico.',
    contexto: 'RBA mantém taxa em 3,60%; postura hawkish moderada. Inflação persistente; dados de emprego e atividade determinam próximos passos. Comunicação cautelosa sobre cortes.',
  },
  BANXICO: {
    impacto: 'Decisões do Banxico podem influenciar IPC Mexicano e USDMXN. Peso sensível a nearshoring, commodities e diferencial de juros com a FED. Metais e cripto acompanham fluxo de risco e liquidez em mercados emergentes.',
    contexto: 'Banxico em 10% após corte de 25 pb. Inflação em trajetória de convergência à meta. Atividade e emprego resilientes; comunicação dependente de dados.',
  },
  SNB: {
    impacto: 'Comunicação do SNB pode impactar SMI e pares com CHF. Franco tende a fortalecer em cenário de juros altos ou intervenção. Ouro e prata acompanham demanda de reserva; cripto reflete apetite a risco na Europa.',
    contexto: 'SNB em 0,5% após corte de 25 pb; postura dovish. Inflação sob controle; franco forte limita pressão inflacionária. Próximas decisões condicionadas a crescimento e FX.',
  },
  PBOC: {
    impacto: 'Guidance do PBOC pode influenciar índices chineses e USDCNY. Yuan sensível a estímulos, reservas e controle de capitais. Metais e cripto acompanham liquidez na Ásia e apetite a risco global.',
    contexto: 'PBOC em ciclo de afrouxamento; taxa em 3,10%. Inflação contida; crescimento e emprego prioritários. Comunicação reforça apoio à economia e estabilidade cambial.',
  },
};

const stripTechnicalMessage = (text) => {
  if (!text || typeof text !== 'string') return text ?? '';
  return text
    .replace(/\s*Resultado divulgado em evento sensível à narrativa[^.]*\.?\s*/gi, '')
    .replace(/\s*Avaliar atualização do Panorama[^.]*\.?\s*/gi, '')
    .trim() || text;
};

const InterestRatesPanel = ({ token }) => {
  const [rates, setRates] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [expandedBank, setExpandedBank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState(null);
  const [maxLastSuccessLabel, setMaxLastSuccessLabel] = useState('');

  // BCs suportados (exatos, nesta ordem)
  const PRIORITY_ORDER = ['FED', 'ECB', 'BOE', 'BOJ', 'BCB', 'BOC', 'RBA', 'PBOC', 'BANXICO', 'SNB'];

  const DISPLAY_META = {
    FED: { name: 'Federal Reserve', country: 'Estados Unidos', country_code: 'US', flag: '🇺🇸', currency: 'USD', next_meeting: '2026-01-29' },
    ECB: { name: 'European Central Bank', country: 'Zona do Euro', country_code: 'EU', flag: '🇪🇺', currency: 'EUR', next_meeting: '2026-01-30' },
    BOE: { name: 'Bank of England', country: 'Reino Unido', country_code: 'GB', flag: '🇬🇧', currency: 'GBP', next_meeting: '2026-02-06' },
    BOJ: { name: 'Bank of Japan', country: 'Japão', country_code: 'JP', flag: '🇯🇵', currency: 'JPY', next_meeting: '2026-01-23' },
    BCB: { name: 'Banco Central do Brasil', country: 'Brasil', country_code: 'BR', flag: '🇧🇷', currency: 'BRL', next_meeting: '2026-01-29' },
    BOC: { name: 'Bank of Canada', country: 'Canadá', country_code: 'CA', flag: '🇨🇦', currency: 'CAD', next_meeting: '2026-01-29' },
    RBA: { name: 'Reserve Bank of Australia', country: 'Austrália', country_code: 'AU', flag: '🇦🇺', currency: 'AUD', next_meeting: '2026-02-18' },
    PBOC: { name: "People's Bank of China", country: 'China', country_code: 'CN', flag: '🇨🇳', currency: 'CNY', next_meeting: '2026-01-20' },
    BANXICO: { name: 'Banco de México', country: 'México', country_code: 'MX', flag: '🇲🇽', currency: 'MXN', next_meeting: '2026-02-13' },
    SNB: { name: 'Swiss National Bank', country: 'Suíça', country_code: 'CH', flag: '🇨🇭', currency: 'CHF', next_meeting: '2026-03-20' },
  };

  useEffect(() => {
    fetchRates();
    const interval = setInterval(fetchRates, 180000);
    return () => clearInterval(interval);
  }, [token]);

  const fetchRates = async () => {
    try {
      // Novo endpoint com staleness + observabilidade
      let response = await fetch(`${API_BASE}/api/mrkt/global-rates`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      // Fallback: endpoint legado (mantém compatibilidade sem quebrar UI)
      if (!response.ok) {
        response = await fetch(`${API_BASE}/api/mrkt/interest-rates`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
      }

      const data = await response.json().catch(() => ({}));
      
      if (data.success) {
        const list = Array.isArray(data.rates) ? data.rates : [];

        // Normalizar contrato único (staleness) para o modelo que o UI já consome
        const normalized = list
          .map((r) => {
            const code = (r?.central_bank || r?.code || '').toString().toUpperCase();
            const meta = DISPLAY_META[code] || { name: code, country: '', country_code: '', flag: '', currency: '', next_meeting: '' };
            return {
              code,
              ...meta,
              // Contrato novo
              policy_name: r?.policy_name ?? '',
              value_label: r?.value_label ?? '',
              effective_label: r?.effective_label ?? '',
              source: r?.source ?? 'auto',
              last_success_label: r?.last_success_label ?? '',
              last_attempt_label: r?.last_attempt_label ?? '',
              is_stale: Boolean(r?.is_stale),
              stale_reason: r?.stale_reason ?? '',
              error_count_rolling: Number.isFinite(r?.error_count_rolling) ? r.error_count_rolling : 0,
              // Campos legados usados pelo layout (manter neutro para não “inventar”)
              current_rate: null,
              last_change: 0,
              direction: 'neutral',
              stance: 'neutral',
              impact: '',
              description: '',
            };
          })
          .filter((b) => PRIORITY_ORDER.includes(b.code));

        const sortedRates = normalized.sort((a, b) => PRIORITY_ORDER.indexOf(a.code) - PRIORITY_ORDER.indexOf(b.code));
        setRates(sortedRates);
        setMaxLastSuccessLabel((data.max_last_success_label || '').toString());
      }
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar taxas:', error);
      setLoading(false);
    }
  };

  const toggleExpand = (code) => {
    setExpandedBank(expandedBank === code ? null : code);
  };

  const openAnalysisModal = (bank, e) => {
    e.stopPropagation();
    setSelectedBank(bank);
    setAnalysisModalOpen(true);
  };

  const getBankImpacto = (bank) => {
    const t = ANALYSE_BY_BANK[bank.code]?.impacto ?? bank.impact ?? '';
    return stripTechnicalMessage(t);
  };

  const getBankContexto = (bank) => {
    const t = ANALYSE_BY_BANK[bank.code]?.contexto ?? bank.description ?? '';
    return stripTechnicalMessage(t);
  };

  const getDaysUntilMeeting = (meetingDate) => {
    if (!meetingDate || typeof meetingDate !== 'string') return 0;
    const today = new Date();
    const meeting = new Date(meetingDate);
    if (isNaN(meeting.getTime())) return 0;
    const diffTime = meeting - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStanceBadge = (stance) => {
    const styles = {
      hawkish: 'bg-red-500/20 text-red-400 border-red-500/30',
      dovish: 'bg-green-500/20 text-green-400 border-green-500/30',
      neutral: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    };

    const labels = {
      hawkish: 'Hawkish',
      dovish: 'Dovish',
      neutral: 'Neutral'
    };

    return (
      <span className={`px-2 py-1 rounded-md text-xs font-semibold border ${styles[stance]}`}>
        {labels[stance]}
      </span>
    );
  };

  const getDirectionIcon = (direction) => {
    if (direction === 'up') {
      return <TrendingUp className="w-4 h-4 text-red-400" />;
    } else if (direction === 'down') {
      return <TrendingDown className="w-4 h-4 text-green-400" />;
    }
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getChangeColor = (direction) => {
    if (direction === 'up') return 'text-red-400';
    if (direction === 'down') return 'text-green-400';
    return 'text-gray-400';
  };

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-lg">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-4 px-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex-shrink-0 animate-pulse" />
            <div className="flex-1">
              <div className="h-6 bg-white/30 rounded w-48 mb-2 animate-pulse" />
              <div className="h-4 bg-white/20 rounded w-64 animate-pulse" />
            </div>
          </div>
        </div>
        <div className="p-6 bg-gray-950 animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-700 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  // Estatísticas para o header
  const stats = {
    raising: rates.filter(r => r.direction === 'up').length,
    cutting: rates.filter(r => r.direction === 'down').length,
    holding: rates.filter(r => r.direction === 'neutral').length,
    totalBanks: rates.length
  };

  return (
    <>
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-lg">
        {/* Header - Banner: mesma tipografia e alinhamento do Panorama Macro Semanal (text-xl font-bold, py-4 px-6, w-10 h-10) */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-4 px-6 transition-all flex items-center justify-between hover:from-purple-700 hover:to-indigo-700 group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">🏦</span>
            </div>
            <div className="flex-1 min-w-0 text-left">
              <h2 className="text-xl font-bold leading-tight">Taxas de Juros Globais</h2>
              <div className="text-sm text-white/80 leading-tight mt-1">
                {stats.totalBanks} Bancos Centrais • {stats.raising} subindo • {stats.cutting} cortando • {stats.holding} mantendo
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

        {/* Conteúdo Expansível */}
        <div
          className={`transition-all duration-300 ease-in-out overflow-hidden ${
            expanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="p-6 bg-gray-950">
            {/* Lista de Bancos Centrais — cada BC com sua própria análise em "Ver Análise Completa" dentro do card */}
            <div className="space-y-4">
              {rates.map((bank) => {
                const isBankExpanded = expandedBank === bank.code;
                const daysUntil = getDaysUntilMeeting(bank.next_meeting);
                const isHighlight = bank.code === 'FED' || bank.code === 'BOJ' || bank.code === 'BCB';

                return (
                  <div
                    key={bank.code}
                    className={`
                      bg-gray-800/50 rounded-lg border transition-all duration-300
                      ${isBankExpanded ? 'border-purple-500/50 shadow-lg shadow-purple-500/10' : 'border-gray-700/50'}
                      ${isHighlight ? 'ring-2 ring-purple-500/20' : ''}
                    `}
                  >
                    {/* Card Principal */}
                    <div
                      onClick={() => toggleExpand(bank.code)}
                      className="px-6 py-4 cursor-pointer hover:bg-gray-800/80 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          {/* Sigla do país à esquerda (branca) */}
                          <div className="text-3xl font-bold text-white uppercase tracking-wide">
                            {bank.country_code}
                          </div>

                          <div className="flex-1">
                            {/* Hierarquia: 1. Sigla do banco central (maior destaque) */}
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-2xl font-bold text-purple-400 uppercase tracking-wide">
                                {bank.code}
                              </span>
                              {bank.is_stale && (
                                <span
                                  className="text-[10px] px-2 py-1 rounded border bg-amber-500/10 text-amber-300 border-amber-500/30"
                                  title={`Defasado: ${bank.stale_reason || 'Atualização atrasada'} • Último sucesso: ${bank.last_success_label || '—'}`}
                                >
                                  Defasado
                                </span>
                              )}
                              {/* 2. Nome do país por extenso (secundário) */}
                              <span className="text-sm text-gray-400">
                                {bank.country}
                              </span>
                            </div>

                            {/* 4. Taxa de juros (destaque numérico) */}
                            <div className="flex items-baseline gap-3 mb-2">
                              <span className="text-3xl font-bold text-white">
                                {(bank.value_label && String(bank.value_label).trim()) ? bank.value_label : '—'}
                              </span>
                              
                              {bank.last_change !== 0 && (
                                <div className={`flex items-center gap-1 ${getChangeColor(bank.direction)}`}>
                                  {getDirectionIcon(bank.direction)}
                                  <span className="text-sm font-semibold">
                                    {bank.last_change > 0 ? '+' : ''}{bank.last_change.toFixed(2)}%
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* 5. Status (Hawkish/Neutral/Dovish) - badge */}
                            {bank.stance && (
                              <div className="mt-1">
                                {getStanceBadge(bank.stance)}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          {getStanceBadge(bank.stance)}
                          
                          <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
                            {isBankExpanded ? (
                              <ChevronUp className="w-5 h-5 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-gray-400" />
                            )}
                          </button>
                        </div>
                      </div>

                      {isHighlight && !isBankExpanded && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-purple-400">
                          <Info className="w-3 h-3" />
                          {bank.code === 'FED' && 'Principal referência global'}
                          {bank.code === 'BOJ' && 'Máximo de 30 anos! 🔥'}
                          {bank.code === 'BCB' && 'Maior taxa global'}
                        </div>
                      )}
                    </div>

                    {/* Card Expandido — Resumo + CTA que abre quadro dedicado (modal) */}
                    {isBankExpanded && (
                      <div className="px-6 pb-6 pt-2 border-t border-gray-700/50">
                        {/* Resumo Rápido */}
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                            <div className="text-xs text-gray-400 mb-1">Taxa Atual</div>
                            <div className="text-2xl font-bold text-white">
                              {(bank.value_label && String(bank.value_label).trim()) ? bank.value_label : '—'}
                            </div>
                          </div>

                          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                            <div className="text-xs text-gray-400 mb-1">Próxima Reunião</div>
                            <div className="text-lg font-bold text-white">
                              {daysUntil > 0 ? `${daysUntil} dias` : 'Em breve'}
                            </div>
                          </div>

                          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                            <div className="text-xs text-gray-400 mb-1">Última Mudança</div>
                            <div className={`text-lg font-bold ${getChangeColor(bank.direction)}`}>
                              {bank.last_change > 0 ? '+' : ''}{bank.last_change.toFixed(2)}%
                            </div>
                          </div>
                        </div>

                        {/* Botão Ver Análise Completa — abre quadro destacado (modal), sem expansão inline */}
                        <button
                          onClick={(e) => openAnalysisModal(bank, e)}
                          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 group text-base"
                        >
                          <Maximize2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                          Ver Análise Completa
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer Info */}
            <div className="mt-6 pt-4 border-t border-gray-700/50 flex items-center justify-between text-xs text-gray-500">
              <div>Última atualização bem-sucedida: {maxLastSuccessLabel || '—'}</div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                <span>Auto-refresh a cada 3 minutos</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quadro dedicado de análise — modal com fundo destacado e foco exclusivo */}
      {selectedBank && (
        <AnalysisModal
          isOpen={analysisModalOpen}
          onClose={() => setAnalysisModalOpen(false)}
          title={`${selectedBank.name} (${selectedBank.code})`}
          icon={selectedBank.flag}
        >
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-gray-300 mb-2">Impacto nos Mercados</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{getBankImpacto(selectedBank)}</p>
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-300 mb-2">Contexto Atual</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{getBankContexto(selectedBank)}</p>
            </div>
          </div>
        </AnalysisModal>
      )}
    </>
  );
};

export default InterestRatesPanel;