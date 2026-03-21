import React, { useState, useEffect } from 'react';
import { LogOut, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import RealtimeEventsPanel from '../components/RealtimeEventsPanel';
import MacroDashboard from '../components/MacroDashboard';
import InterestRatesPanel from '../components/InterestRatesPanel';
import ICTKnowledgeModalV2 from '../components/ICTKnowledgeModalV2';
import CorrelationModal from '../components/CorrelationModal';
import SubscriptionModal from '../components/SubscriptionModal';
import ErrorBoundary from '../components/ErrorBoundary';
import HistoryIconButton from '../components/HistoryIconButton';
import WeeklyHistoryModal from '../components/WeeklyHistoryModal';
import { fetchLatestAnalysis, fetchAnalysisByWeek } from '../services/api';
import { useMarketIndicators } from '../hooks/useMarketIndicators';

// ============================================
// ÍCONES PERSONALIZADOS PARA HEADERS
// ============================================
const MarketSentimentIcon = ({ size = 24, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    className={className}
  >
    <path
      d="M3 15 L7 12 L10 14 L14 8 L17 11 L21 6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <circle cx="3" cy="15" r="1.5" fill="currentColor" />
    <circle cx="7" cy="12" r="1.5" fill="currentColor" />
    <circle cx="10" cy="14" r="1.5" fill="currentColor" />
    <circle cx="14" cy="8" r="1.5" fill="currentColor" />
    <circle cx="17" cy="11" r="1.5" fill="currentColor" />
    <circle cx="21" cy="6" r="1.5" fill="currentColor" />
    <path
      d="M19 4 L21 6 L19 8"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M3 15 L7 12 L10 14 L14 8 L17 11 L21 6 L21 20 L3 20 Z"
      fill="currentColor"
      opacity="0.1"
    />
  </svg>
);

const VIXIcon = ({ size = 24, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    className={className}
  >
    <path
      d="M2 12 Q4 8 6 12 T10 12"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      opacity="0.3"
    />
    <path
      d="M14 12 Q16 16 18 12 T22 12"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      opacity="0.3"
    />
    <path
      d="M13 2 L8 11 L11 11 L9 22 L17 10 L14 10 L13 2 Z"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="0.5"
      strokeLinejoin="round"
    />
    <path
      d="M11 6 L10 9 M15 13 L14 16"
      stroke="white"
      strokeWidth="1"
      strokeLinecap="round"
      opacity="0.5"
    />
  </svg>
);

// ============================================
// CALIBRATED GAUGE - SEM SOBREPOSIÇÃO
// ============================================
const CalibratedGauge = ({ value, maxValue = 100, colors }) => {
  const size = 180;
  const strokeWidth = 16;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  
  const normalizedValue = Math.max(0, Math.min(100, (value / maxValue) * 100));
  
  const startAngle = -180;
  const endAngle = 0;
  const totalAngle = endAngle - startAngle;
  const valueAngle = startAngle + (normalizedValue / 100) * totalAngle;
  
  const polarToCartesian = (angle) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: center + radius * Math.cos(rad),
      y: center + radius * Math.sin(rad)
    };
  };
  
  const createArc = (start, end, color) => {
    const startPoint = polarToCartesian(start);
    const endPoint = polarToCartesian(end);
    const largeArc = end - start > 180 ? 1 : 0;
    
    return (
      <path
        key={`${start}-${end}-${color}`}
        d={`M ${startPoint.x} ${startPoint.y} A ${radius} ${radius} 0 ${largeArc} 1 ${endPoint.x} ${endPoint.y}`}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="butt"
      />
    );
  };
  
  const pointerPoint = polarToCartesian(valueAngle);

  return (
    <svg width={size} height={size * 0.6} viewBox={`0 0 ${size} ${size * 0.6}`}>
      <path
        d={`M ${strokeWidth / 2} ${center} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${center}`}
        fill="none"
        stroke="#1f2937"
        strokeWidth={strokeWidth}
        strokeLinecap="butt"
      />
      
      {colors.map((segment) => createArc(segment.start, segment.end, segment.color))}
      
      <circle
        cx={center}
        cy={center}
        r="16"
        fill="#1f2937"
        stroke="#374151"
        strokeWidth="2"
      />
      
      {/* Determinar cor do ponteiro baseado no valor normalizado */}
      {(() => {
        // Converter ângulo do ponteiro para porcentagem (0-100)
        const pointerPercent = ((valueAngle + 180) / 180) * 100;
        
        // Encontrar segmento de cor correspondente
        const pointerColor = colors.find(seg => {
          const segStartPercent = ((seg.start + 180) / 180) * 100;
          const segEndPercent = ((seg.end + 180) / 180) * 100;
          return pointerPercent >= segStartPercent && pointerPercent <= segEndPercent;
        })?.color || colors[colors.length - 1].color;
        
        return (
          <>
            <line
              x1={center}
              y1={center}
              x2={pointerPoint.x}
              y2={pointerPoint.y}
              stroke={pointerColor}
              strokeWidth="3"
              strokeLinecap="round"
            />
            
            <circle
              cx={pointerPoint.x}
              cy={pointerPoint.y}
              r="6"
              fill={pointerColor}
              stroke={pointerColor}
              strokeWidth="2"
            />
          </>
        );
      })()}
    </svg>
  );
};

// ============================================
// FEAR & GREED PROFESSIONAL
// ============================================
const FearGreedProfessional = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFearGreed();
    const interval = setInterval(fetchFearGreed, 300000);
    return () => clearInterval(interval);
  }, []);

  const fetchFearGreed = async () => {
    try {
      const response = await fetch('https://api.alternative.me/fng/?limit=4');
      const result = await response.json();
      if (result.data) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Erro ao buscar Fear & Greed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getColorClass = (value) => {
    if (value >= 75) return 'text-green-500';
    if (value >= 55) return 'text-green-400';
    if (value >= 45) return 'text-yellow-500';
    if (value >= 25) return 'text-orange-500';
    return 'text-red-500';
  };

  const getBgColorClass = (value) => {
    if (value >= 75) return 'bg-green-500';
    if (value >= 55) return 'bg-green-400';
    if (value >= 45) return 'bg-yellow-500';
    if (value >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getLabel = (value) => {
    if (value >= 75) return 'Extreme Greed';
    if (value >= 55) return 'Greed';
    if (value >= 45) return 'Neutral';
    if (value >= 25) return 'Fear';
    return 'Extreme Fear';
  };

  const getTimeLabel = (index) => {
    if (index === 0) return 'Hoje';
    if (index === 1) return 'Ontem';
    if (index === 2) return 'Anteontem';
    return 'Há 3 dias';
  };

  const fearGreedColors = [
    { start: -180, end: -108, color: '#ef4444' },
    { start: -108, end: -72, color: '#f97316' },
    { start: -72, end: -36, color: '#eab308' },
    { start: -36, end: -18, color: '#84cc16' },
    { start: -18, end: 0, color: '#22c55e' }
  ];

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <div className="animate-pulse">
          <div className="h-5 bg-gray-700 rounded w-3/4 mb-4"></div>
          <div className="h-40 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <div className="text-center text-gray-400">❌ Erro ao carregar</div>
      </div>
    );
  }

  const currentValue = parseInt(data[0].value);
  const currentLabel = getLabel(currentValue);

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-xl">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 px-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <MarketSentimentIcon size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-base leading-tight">Fear & Greed Index</div>
            <div className="text-xs text-white/80 leading-tight">Sentimento do mercado</div>
          </div>
        </div>
      </div>

      <div className="p-6 bg-gray-950">
        <div className="flex flex-col items-center mb-6">
          <CalibratedGauge value={currentValue} maxValue={100} colors={fearGreedColors} />
          
          <div className="mt-4 text-center">
            <div className={`text-5xl font-bold leading-none ${getColorClass(currentValue)} mb-2`}>
              {currentValue}
            </div>
            <div className={`text-base font-semibold ${getColorClass(currentValue)}`}>
              {currentLabel}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-4 mt-2">
          <div className="text-sm font-semibold text-gray-400 mb-3">Histórico</div>
          <div className="space-y-2.5">
            {data.slice(0, 4).map((entry, index) => {
              const value = parseInt(entry.value);
              return (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-400 font-medium w-24">{getTimeLabel(index)}</span>
                  <div className="flex items-center gap-3 flex-1 justify-end">
                    <span className={`text-sm font-bold ${getColorClass(value)} text-right min-w-[110px]`}>
                      {getLabel(value)}
                    </span>
                    <div className={`${getBgColorClass(value)} rounded-full w-10 h-10 flex items-center justify-center shadow-lg flex-shrink-0`}>
                      <span className="text-white text-sm font-bold">{value}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// VIX PROFESSIONAL
// ============================================
const VIXProfessional = () => {
  const [vixHistory] = useState([
    { date: 'Hoje', value: 15.8 },
    { date: 'Ontem', value: 16.2 },
    { date: 'Anteontem', value: 14.5 },
    { date: 'Há 3 dias', value: 15.1 }
  ]);

  // Ranges fixos conforme especificação
  const getVixColor = (value) => {
    if (value < 16) return 'text-green-500';      // Baixa Volatilidade
    if (value < 20) return 'text-yellow-500';     // Volatilidade Moderada
    return 'text-red-500';                         // Alta Volatilidade
  };

  const getVixBgColor = (value) => {
    if (value < 16) return 'bg-green-500';        // Baixa Volatilidade
    if (value < 20) return 'bg-yellow-500';       // Volatilidade Moderada
    return 'bg-red-500';                          // Alta Volatilidade
  };

  const getVixLabel = (value) => {
    if (value < 16) return 'Baixa Volatilidade';
    if (value < 20) return 'Volatilidade Moderada';
    return 'Alta Volatilidade';
  };

  // Cores do arco do gauge (deve corresponder aos ranges fixos)
  // Arco de 180 graus (-180 a 0), dividido proporcionalmente:
  // < 16: 0-40% do arco (Verde)
  // 16-20: 40-60% do arco (Amarelo)
  // ≥ 20: 60-100% do arco (Vermelho)
  const vixColors = [
    { start: -180, end: -108, color: '#22c55e' },   // < 16: Verde (0-40% do arco)
    { start: -108, end: -72, color: '#eab308' },    // 16-20: Amarelo (40-60% do arco)
    { start: -72, end: 0, color: '#ef4444' }        // ≥ 20: Vermelho (60-100% do arco)
  ];

  const currentValue = vixHistory[0].value;
  const currentLabel = getVixLabel(currentValue);
  
  // Normalização: VIX range 10-50 mapeado para 0-100%
  const minVIX = 10;
  const maxVIX = 50;
  const normalizedValue = ((currentValue - minVIX) / (maxVIX - minVIX)) * 100;

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-xl">
      <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white py-3 px-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <VIXIcon size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-base leading-tight">VIX Index</div>
            <div className="text-xs text-white/80 leading-tight">Volatilidade</div>
          </div>
        </div>
      </div>

      <div className="p-6 bg-gray-950">
        <div className="flex flex-col items-center mb-6">
          <CalibratedGauge value={normalizedValue} maxValue={100} colors={vixColors} />
          
          <div className="mt-4 text-center">
            {/* Valor numérico com cor do range */}
            <div className={`text-5xl font-bold leading-none ${getVixColor(currentValue)} mb-2`}>
              {currentValue.toFixed(1)}
            </div>
            {/* Label com cor do range */}
            <div className={`text-base font-semibold ${getVixColor(currentValue)}`}>
              {currentLabel}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-4 mt-2">
          <div className="text-sm font-semibold text-gray-400 mb-3">Histórico</div>
          <div className="space-y-2.5">
            {vixHistory.map((entry, index) => {
              const value = entry.value;
              return (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-400 font-medium w-24">{entry.date}</span>
                  <div className="flex items-center gap-3 flex-1 justify-end">
                    <span className={`text-sm font-bold ${getVixColor(value)} text-right min-w-[110px]`}>
                      {getVixLabel(value)}
                    </span>
                    <div className={`${getVixBgColor(value)} rounded-full w-11 h-10 flex items-center justify-center shadow-lg flex-shrink-0`}>
                      <span className="text-white text-sm font-bold">{value.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// HEAT MAP COMPACT
// ============================================
const InterestRatesHeatMapCompact = ({ token }) => {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRates();
    const interval = setInterval(fetchRates, 300000);
    return () => clearInterval(interval);
  }, [token]);

  const fetchRates = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/mrkt/interest-rates', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setRates(data.rates);
      }
    } catch (error) {
      console.error('Erro ao buscar taxas:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRateColor = (rate) => {
    const value = parseFloat(rate);
    if (isNaN(value)) return 'bg-gray-700';
    
    if (value <= 0.5) return 'bg-green-600';
    if (value <= 1.5) return 'bg-green-500';
    if (value <= 2.5) return 'bg-yellow-500';
    if (value <= 3.5) return 'bg-orange-500';
    if (value <= 4.5) return 'bg-red-500';
    return 'bg-red-600';
  };

  const getTrendIcon = (stance) => {
    if (stance.toLowerCase().includes('hawkish')) {
      return <TrendingUp className="w-3 h-3" />;
    } else if (stance.toLowerCase().includes('dovish')) {
      return <TrendingDown className="w-3 h-3" />;
    }
    return <Minus className="w-3 h-3" />;
  };

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <div className="animate-pulse">
          <div className="h-5 bg-gray-700 rounded w-3/4 mb-4"></div>
          <div className="grid grid-cols-3 gap-2">
            {[1,2,3,4,5,6,7,8,9].map(i => (
              <div key={i} className="h-14 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-xl">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 px-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-lg leading-none">🌡️</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-base leading-tight">Heat Map</div>
            <div className="text-xs text-white/80 leading-tight">Taxas Globais</div>
          </div>
        </div>
      </div>

      <div className="p-4 bg-gray-950">
        <div className="grid grid-cols-3 gap-2">
          {rates.map((bank) => (
            <div
              key={bank.code}
              className={`${getRateColor(bank.current_rate)} rounded-lg p-3 transition-all duration-300 hover:scale-105 cursor-pointer shadow-lg`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-white font-bold text-xs leading-none">{bank.code}</span>
                <div className="text-white opacity-75">
                  {getTrendIcon(bank.stance)}
                </div>
              </div>
              <div className="text-white text-xl font-bold leading-tight">
                {bank.current_rate}%
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-gray-800">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-600 flex-shrink-0"></div>
              <span className="text-gray-400">0-1.5%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-yellow-500 flex-shrink-0"></div>
              <span className="text-gray-400">1.5-2.5%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-orange-500 flex-shrink-0"></div>
              <span className="text-gray-400">2.5-3.5%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-600 flex-shrink-0"></div>
              <span className="text-gray-400">4.5%+</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// DASHBOARD PRINCIPAL
// ============================================
const Dashboard = ({ user, onLogout }) => {
  const [token] = useState(localStorage.getItem('token'));
  const [ictModalOpen, setIctModalOpen] = useState(false);
  const [correlationModalOpen, setCorrelationModalOpen] = useState(false);
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(true);
  const [analysisError, setAnalysisError] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(null);
  
  // Indicadores de mercado para classificação de regime de risco
  // Normalização defensiva: garantir que sempre existem (null se indisponível)
  const { fearGreedValue: rawFearGreed, vixValue: rawVix } = useMarketIndicators();
  const fearGreedValue = rawFearGreed ?? null;
  const vixValue = rawVix ?? null;

  useEffect(() => {
    // MODO DASHBOARD_COMMIT_STRICT = TRUE
    // Forçar invalidação de cache e recarregar dados do banco
    loadLatestAnalysis();
  }, []);

  const loadLatestAnalysis = async () => {
    setAnalysisLoading(true);
    setAnalysisError(null);
    setSelectedWeek(null);
    try {
      // MODO DASHBOARD_COMMIT_STRICT = TRUE
      // Forçar invalidação de cache e recarregar dados do banco
      const data = await fetchLatestAnalysis();
      if (data && typeof data === 'object') {
        setAnalysisData(data);
        // Forçar re-render completo
        window.dispatchEvent(new Event('analysis-updated'));
      } else {
        setAnalysisError('Dados recebidos em formato inválido');
      }
    } catch (error) {
      const errorMessage = error?.message || 'Não foi possível carregar a análise mais recente';
      setAnalysisError(errorMessage);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const loadAnalysisByWeek = async (weekStart) => {
    if (!weekStart || typeof weekStart !== 'string') {
      setAnalysisError('Semana inválida selecionada');
      return;
    }

    setAnalysisLoading(true);
    setAnalysisError(null);
    setSelectedWeek(weekStart);
    try {
      const data = await fetchAnalysisByWeek(weekStart);
      if (data && typeof data === 'object') {
        setAnalysisData(data);
      } else {
        setAnalysisError('Dados recebidos em formato inválido');
      }
    } catch (error) {
      const errorMessage = error?.message || 'Não foi possível carregar a análise da semana selecionada';
      setAnalysisError(errorMessage);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleSelectWeek = (weekStart) => {
    if (weekStart === selectedWeek) return;
    loadAnalysisByWeek(weekStart);
  };

  const formatDate = (dateString) => {
    if (!dateString || typeof dateString !== 'string') return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* HEADER */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">📈</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white leading-tight">MRKT Edge</h1>
                <p className="text-xs text-gray-400 leading-tight">ForexFactory Intelligence</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Ícone discreto (canto direito): histórico semanal */}
              <HistoryIconButton onClick={() => setHistoryOpen(true)} />
              <button
                onClick={() => setIctModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 text-sm"
              >
                <span>📚</span>
                <span className="hidden sm:inline">ICT Knowledge</span>
              </button>
              <button
                onClick={() => setCorrelationModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 text-sm"
              >
                <span>🔗</span>
                <span className="hidden sm:inline">Correlação</span>
              </button>

              <div className="text-right">
                <div className="text-sm font-medium text-white leading-tight">{user.username}</div>
                <div className="text-xs text-gray-400 leading-tight">{user.email}</div>
              </div>
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
              >
                <LogOut className="w-4 h-4" />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* COLUNA PRINCIPAL (3/4) */}
          <div className="lg:col-span-3 space-y-6">

            {/* Banner expansivo "Panorama Macro Semanal" está dentro de MacroDashboard.
                Este bloco abaixo apenas gerencia estados (loading/erro) e não duplica o banner. */}
            {selectedWeek && (
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-400">
                  Visualizando semana específica
                </span>
                <button
                  onClick={loadLatestAnalysis}
                  disabled={analysisLoading}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm disabled:opacity-50"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Voltar ao mais recente</span>
                </button>
              </div>
            )}

            {/* Banner expansivo "Panorama Macro Semanal" sempre renderizado (via MacroDashboard) */}
            <ErrorBoundary>
              <MacroDashboard 
                analysisData={analysisData} 
                fearGreedValue={fearGreedValue}
                vixValue={vixValue}
              />
            </ErrorBoundary>

            {/* Estados de loading/erro abaixo do banner (não duplicam título) */}
            {analysisLoading && (
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-400">Carregando análise macro...</p>
                </div>
              </div>
            )}

            {analysisError && (
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                <div className="text-center py-12">
                  <div className="text-red-400 text-xl mb-4">❌ Erro ao carregar análise</div>
                  <p className="text-gray-400 mb-4">{analysisError}</p>
                  <button
                    onClick={selectedWeek ? () => loadAnalysisByWeek(selectedWeek) : loadLatestAnalysis}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Tentar novamente</span>
                  </button>
                </div>
              </div>
            )}

            <InterestRatesPanel token={token} />
            <RealtimeEventsPanel token={token} />
          </div>

          {/* COLUNA LATERAL (1/4) */}
          <div className="lg:col-span-1 space-y-6">
            <FearGreedProfessional />
            <VIXProfessional />
            <InterestRatesHeatMapCompact token={token} />
          </div>

        </div>

      </main>

      {/* ICT MODAL */}
      <ICTKnowledgeModalV2
        isOpen={ictModalOpen}
        onClose={() => setIctModalOpen(false)}
      />

      {/* CORRELAÇÃO — espelho Mataf, sem inferência */}
      <CorrelationModal
        isOpen={correlationModalOpen}
        onClose={() => setCorrelationModalOpen(false)}
      />

      {/* ASSINATURA — NeonPay */}
      <SubscriptionModal
        isOpen={subscriptionModalOpen}
        onClose={() => setSubscriptionModalOpen(false)}
        token={token}
        user={user}
      />

      {/* HISTÓRICO SEMANAL (modal compacto) */}
      <WeeklyHistoryModal
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSelectWeek={handleSelectWeek}
        selectedWeek={selectedWeek}
      />

      {/* FOOTER */}
      <footer className="bg-gray-900 border-t border-gray-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between text-sm">
            <div className="text-gray-400">
              © 2024 MRKT Edge. Todos os direitos reservados.
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-gray-400">Sistema Online</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;