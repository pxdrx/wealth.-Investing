import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { fetchAnalysisList } from '../services/api';

const WeeklySelector = ({ selectedWeek, onSelectWeek, isLoading }) => {
  const [weeks, setWeeks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadWeeks();
  }, []);

  const loadWeeks = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAnalysisList(50, 0);
      // Contrato: { items: [], limit, offset, total }; items ausente -> default []
      const list = data?.items ?? (Array.isArray(data) ? data : []);
      setWeeks(Array.isArray(list) ? list : []);
    } catch (err) {
      // Tratar como opcional - não exibir erro, apenas usar array vazio
      setWeeks([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (isFrozen) => {
    if (isFrozen) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
          <CheckCircle className="w-3 h-3" />
          Frozen
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
        <Clock className="w-3 h-3" />
        Draft
      </span>
    );
  };

  const isSelected = (weekStart) => {
    return selectedWeek === weekStart;
  };

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-400">Carregando histórico...</span>
        </div>
      </div>
    );
  }

  // Histórico é opcional - se não houver dados, não exibir nada (retornar null)
  if (!weeks || weeks.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-lg">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Histórico Semanal</h3>
              <p className="text-xs text-indigo-100">Selecione uma semana para análise</p>
            </div>
          </div>
          <button
            onClick={loadWeeks}
            disabled={loading}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="p-4 bg-gray-950 max-h-96 overflow-y-auto">
        <div className="space-y-2">
          {weeks.map((week, index) => {
            if (!week || typeof week !== 'object') return null;
            
            const weekStart = week.week_start || null;
            const weekEnd = week.week_end || null;
            const isFrozen = Boolean(week.is_frozen);
            const generatedAt = week.generated_at || null;
            const source = week.source || null;

            if (!weekStart) return null;

            return (
              <button
                key={weekStart || index}
                onClick={() => weekStart && onSelectWeek(weekStart)}
                disabled={isLoading || isSelected(weekStart) || !weekStart}
                className={`
                  w-full text-left p-3 rounded-lg border transition-all
                  ${
                    isSelected(weekStart)
                      ? 'bg-blue-600/20 border-blue-500/50 cursor-default'
                      : 'bg-gray-800/50 border-gray-700 hover:bg-gray-800 hover:border-gray-600'
                  }
                  ${isLoading || !weekStart ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">
                      {formatDate(weekStart)} → {formatDate(weekEnd)}
                    </span>
                    {getStatusBadge(isFrozen)}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Gerado: {formatDate(generatedAt)}</span>
                  <span className="text-gray-500">UTC</span>
                </div>
                {source && typeof source === 'string' && (
                  <div className="text-xs text-gray-500 mt-1">Fonte: {source}</div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WeeklySelector;
