import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { fetchAnalysisList } from '../services/api';

const formatDate = (dateString) => {
  if (!dateString || typeof dateString !== 'string') return 'N/A';
  try {
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return 'N/A';
  }
};

const WeeklyHistoryModal = ({ isOpen, onClose, onSelectWeek, selectedWeek }) => {
  const titleRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // "ok" | "unavailable" | null
  const [reason, setReason] = useState(null);
  const [items, setItems] = useState([]);
  const [limit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  const canPrev = offset > 0;
  const canNext = offset + limit < total;

  const load = async (nextOffset = 0) => {
    setLoading(true);
    try {
      const res = await fetchAnalysisList(limit, nextOffset);
      setStatus(res?.status || 'ok');
      setReason(res?.reason || null);
      setItems(Array.isArray(res?.items) ? res.items : []);
      setTotal(typeof res?.total === 'number' ? res.total : 0);
      setOffset(typeof res?.offset === 'number' ? res.offset : nextOffset);
    } catch (e) {
      // fetchAnalysisList já é fail-soft, mas garantir
      setStatus('unavailable');
      setReason(e?.message || 'Erro ao carregar histórico');
      setItems([]);
      setTotal(0);
      setOffset(nextOffset);
    } finally {
      setLoading(false);
    }
  };

  // Lazy load: só busca quando abrir
  useEffect(() => {
    if (!isOpen) return;
    load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Foco e Esc
  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => titleRef.current?.focus?.(), 0);
    const onKeyDown = (ev) => {
      if (ev.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  const visibleItems = useMemo(() => (Array.isArray(items) ? items.slice(0, 10) : []), [items]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4"
      onMouseDown={(e) => {
        // clique fora fecha
        if (e.target === e.currentTarget) onClose?.();
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="weekly-history-title"
        className="w-full max-w-md rounded-xl border border-gray-800 bg-gray-950 shadow-2xl"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <h2
            id="weekly-history-title"
            ref={titleRef}
            tabIndex={-1}
            className="text-sm font-semibold text-white outline-none"
          >
            Histórico semanal
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => load(offset)}
              disabled={loading}
              className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
              title="Atualizar"
              aria-label="Atualizar histórico semanal"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              title="Fechar"
              aria-label="Fechar histórico semanal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-4 py-3">
          {loading ? (
            <div className="text-sm text-gray-400">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-gray-800 rounded w-2/3" />
                <div className="h-4 bg-gray-800 rounded w-full" />
                <div className="h-4 bg-gray-800 rounded w-5/6" />
              </div>
              <div className="mt-3">Carregando…</div>
            </div>
          ) : status === 'unavailable' ? (
            <div className="text-sm text-amber-200 bg-amber-900/20 border border-amber-700/50 rounded-lg p-3">
              Histórico indisponível{reason ? `: ${reason}` : '.'}
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="text-sm text-gray-400">Sem histórico nesta semana</div>
          ) : (
            <div className="max-h-80 overflow-y-auto pr-1">
              <div className="space-y-2">
                {visibleItems.map((w, idx) => {
                  if (!w || typeof w !== 'object') return null;
                  const weekStart = w.week_start || null;
                  const weekEnd = w.week_end || null;
                  const isFrozen = Boolean(w.is_frozen);
                  const label = weekStart ? `${formatDate(weekStart)} → ${formatDate(weekEnd)}` : 'Semana';
                  const isActive = weekStart && selectedWeek === weekStart;
                  return (
                    <button
                      key={weekStart || idx}
                      type="button"
                      onClick={() => {
                        if (weekStart) onSelectWeek?.(weekStart);
                        onClose?.();
                      }}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        isActive
                          ? 'bg-blue-600/20 border-blue-500/50'
                          : 'bg-gray-900 border-gray-800 hover:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white truncate">{label}</div>
                          <div className="text-xs text-gray-500 truncate">
                            {isFrozen ? 'Frozen' : 'Draft'}
                            {w.generated_at ? ` • Gerado: ${formatDate(w.generated_at)}` : ''}
                          </div>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-1 rounded border flex-shrink-0 ${
                            isFrozen
                              ? 'bg-green-500/10 text-green-300 border-green-500/30'
                              : 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30'
                          }`}
                        >
                          {isFrozen ? 'Frozen' : 'Draft'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-gray-800 flex items-center justify-between text-xs text-gray-500">
          <span className="truncate">Total: {typeof total === 'number' ? total : 0}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => load(Math.max(0, offset - limit))}
              disabled={loading || !canPrev}
              className="px-2 py-1 rounded border border-gray-800 hover:bg-gray-900 disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => load(offset + limit)}
              disabled={loading || !canNext}
              className="px-2 py-1 rounded border border-gray-800 hover:bg-gray-900 disabled:opacity-50"
            >
              Próximo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklyHistoryModal;

