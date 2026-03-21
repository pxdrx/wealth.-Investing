import React, { useState, useEffect } from 'react';
import EventCardExpanded from './EventCardExpanded';

// EVENT_DASHBOARD_HARD_RESET_STRICT = TRUE
// Fonte ÚNICA: /api/mrkt/realtime-events.
// Validação BLOQUEANTE: total=84, high=14, medium=12, low=58. Se falhar → abortar render.
const STRICT_COUNTS = { total: 84, high: 14, medium: 12, low: 58, displayed: 26 };
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

const RealtimeEventsPanel = ({ token }) => {
  const [expanded, setExpanded] = useState(false);
  const [openEventId, setOpenEventId] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState('monday');
  const [strictError, setStrictError] = useState(null);
  const [snapshotMeta, setSnapshotMeta] = useState(null);
  const [narrativeAlert, setNarrativeAlert] = useState(false);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 180000);
    return () => clearInterval(interval);
  }, [token]);

  const fetchEvents = async () => {
    setLoading(true);
    setStrictError(null);
    try {
      const cacheBuster = `?nocache=${Math.random().toString(36).slice(2)}`;
      const response = await fetch(`${API_BASE}/api/mrkt/realtime-events${cacheBuster}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      });
      
      // Contrato: sempre retorna 200, mesmo em erro
      if (!response.ok) {
        // Se não for 200, tratar como unavailable
        setStrictError(`Erro HTTP ${response.status}: ${response.statusText}`);
        setEvents([]);
        setSnapshotMeta(null);
        setNarrativeAlert(false);
        return;
      }
      
      const data = await response.json();
      
      // Contrato novo: { status: "ok"|"unavailable", items: [], reason?, summary?, ... }
      const status = data.status || (data.success === false ? "unavailable" : "ok");
      const items = data.items || data.events || []; // Compatibilidade: aceitar "events" também
      const reason = data.reason || null;
      
      // Se status unavailable, mostrar reason e usar items (pode estar vazio)
      if (status === "unavailable") {
        setStrictError(reason || "Dados indisponíveis");
        // Ainda assim tentar renderizar items se houver (degradação controlada)
        setEvents(Array.isArray(items) ? items : []);
        setSnapshotMeta(data.snapshot_id ? {
          snapshot_id: data.snapshot_id,
          rendered_at: data.rendered_at,
          status: status,
        } : null);
        setNarrativeAlert(false);
        return;
      }
      
      // Status ok: validar contadores (não bloqueante - apenas warning)
      const s = data.summary || {};
      const countsMatch = (
        s.total === STRICT_COUNTS.total && 
        s.high === STRICT_COUNTS.high &&
        s.medium === STRICT_COUNTS.medium && 
        s.low === STRICT_COUNTS.low
      );
      
      if (!countsMatch) {
        // Warning não bloqueante - ainda renderizar eventos
        console.warn(
          `Contadores divergentes. Esperado: total=${STRICT_COUNTS.total} high=${STRICT_COUNTS.high} medium=${STRICT_COUNTS.medium} low=${STRICT_COUNTS.low}. ` +
          `Atual: total=${s.total} high=${s.high} medium=${s.medium} low=${s.low}`
        );
        // Não bloquear renderização - apenas logar warning
      }

      // weekday = ENUM textual fixo ["Monday","Tuesday",...]. Normalizar para garantir e.weekday === "Monday".
      const WEEKDAY_NORM = { monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday', sunday: 'Sunday', saturday: 'Saturday', mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sun: 'Sunday', sat: 'Saturday' };
      
      // Processar items com fail-safe
      const list = (Array.isArray(items) ? items : []).map((e, idx) => {
        try {
          if (!e || typeof e !== 'object') return null;
          
          const print_time_label = e.print_time_label ?? e.time_raw ?? e.time ?? '';
          // Validação não bloqueante - apenas logar warning
          if (print_time_label && (typeof print_time_label !== 'string' || String(print_time_label).includes('Z') || String(print_time_label).includes('+'))) {
            console.warn(`Event ${e.id || idx}: timezone contamination detectado: ${print_time_label}`);
          }
          
          const wRaw = (e.weekday ?? 'Monday').toString().trim().toLowerCase();
          const weekday = WEEKDAY_NORM[wRaw] ?? 'Monday';
          const r = e.result || {};
          
          const item = {
            ...e,
            // PRESERVAR event_id canônico (backend é fonte da verdade)
            event_id: e.event_id || null,  // Garantir que event_id está presente (ou null se ausente)
            name: e.name || e.event || e.title || 'Evento sem nome',
            event: e.name || e.event || e.title || 'Evento sem nome',
            print_date_label: e.print_date_label ?? e.date ?? '',
            print_time_label,
            weekday,
            impact: (e.impact || '').toUpperCase(),
            actual: r.actual ?? e.actual,
            forecast: r.forecast ?? e.forecast,
            previous: r.previous ?? e.previous,
            narrative_sensitive: Boolean(e.narrative_sensitive),
          };
          
          // VALIDAÇÃO: logar warning se event_id ausente (mas não bloquear renderização)
          if (!item.event_id) {
            console.warn(`RealtimeEventsPanel: evento processado sem event_id canônico (índice ${idx})`, item);
          }
          
          return item;
        } catch (itemErr) {
          console.warn(`Erro ao processar evento ${idx}:`, itemErr);
          return null;
        }
      }).filter(item => item !== null); // Remover nulls de processamento falho
      
      setEvents(list);
      setNarrativeAlert(Boolean(data.narrative_alert));
      setSnapshotMeta({
        snapshot_id: data.snapshot_id || data.snapshot_id,
        rendered_at: data.rendered_at,
        status: status,
      });
    } catch (err) {
      // Erro de rede/parse: tratar como unavailable
      console.warn('Erro ao buscar eventos:', err);
      setStrictError('Falha ao carregar eventos. Verifique o backend.');
      setEvents([]);
      setSnapshotMeta(null);
      setNarrativeAlert(false);
    } finally {
      setLoading(false);
    }
  };

  // Filtro por dia — sem data. Mapa fixo: weekday já vem do backend ("Monday", "Tuesday", ...).
  const WEEKDAY_BY_KEY = { monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday' };
  const dayButtons = [
    { key: 'monday', weekday: 'Monday', fullLabel: 'Segunda' },
    { key: 'tuesday', weekday: 'Tuesday', fullLabel: 'Terça' },
    { key: 'wednesday', weekday: 'Wednesday', fullLabel: 'Quarta' },
    { key: 'thursday', weekday: 'Thursday', fullLabel: 'Quinta' },
    { key: 'friday', weekday: 'Friday', fullLabel: 'Sexta' },
  ];

  const getDayStats = (weekday) => {
    // Fail-safe: garantir que events é array
    const safeEvents = Array.isArray(events) ? events : [];
    const dayEvents = safeEvents.filter((e) => e && e.weekday === weekday);
    const high = dayEvents.filter((e) => e.impact === 'HIGH').length;
    const medium = dayEvents.filter((e) => e.impact === 'MEDIUM').length;
    return { count: high + medium, high, medium };
  };

  const selectedWeekday = WEEKDAY_BY_KEY[selectedDay];
  // Fail-safe: garantir que events é array antes de filtrar
  const safeEvents = Array.isArray(events) ? events : [];
  const filteredEvents = safeEvents.filter((e) => e && e.weekday === selectedWeekday);

  // Ordenação: usar EXCLUSIVAMENTE a ordem recebida da API (já ORDER BY sort_time_key ASC).
  // Proibido ordenar por string de horário no frontend. Exibição usa somente print_time_label.
  const sortedEventsForWeek = filteredEvents;

  const totalEvents = snapshotMeta ? STRICT_COUNTS.total : 0;
  const highImpactCount = snapshotMeta ? STRICT_COUNTS.high : 0;
  const mediumImpactCount = snapshotMeta ? STRICT_COUNTS.medium : 0;
  const lowImpactCount = snapshotMeta ? STRICT_COUNTS.low : 0;
  const displayedEventsCount = STRICT_COUNTS.displayed;

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-lg">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 px-6 transition-all flex items-center justify-between hover:from-purple-700 hover:to-blue-700 group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">📅</span>
          </div>
          <div className="flex-1 min-w-0 text-left">
            <h2 className="text-xl font-bold leading-tight">Eventos da Semana</h2>
            <div className="text-sm text-white/80 leading-tight mt-1">
              {snapshotMeta?.status === 'DASHBOARD_SYNCED_STRICT'
                ? `${highImpactCount} HIGH • ${mediumImpactCount} MEDIUM • ${lowImpactCount} LOW`
                : 'Calendário econômico'}
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

      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${expanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="bg-gray-950 p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto" />
              <p className="text-gray-400 mt-4">Carregando eventos...</p>
            </div>
          ) : (
            <>
              {/* Mensagem de erro (não bloqueante) */}
              {strictError && (
                <div className="bg-amber-900/20 rounded-lg p-4 border border-amber-700/50 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">⚠️</span>
                    <h3 className="text-sm font-semibold text-amber-400">Dados Indisponíveis</h3>
                  </div>
                  <p className="text-amber-200 text-sm mb-2">{strictError}</p>
                  {safeEvents.length > 0 && (
                    <p className="text-amber-300 text-xs italic">
                      Alguns eventos foram carregados, mas a validação falhou. Exibindo dados parciais.
                    </p>
                  )}
                </div>
              )}
              
              {/* Renderizar eventos sempre que disponíveis (mesmo com strictError) */}
              {safeEvents.length > 0 ? (
                <div>
                  {/* narrative_alert/narrative_sensitive: apenas lógica interna; sem aviso por evento. */}
                  <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-800/50 rounded-lg p-4 text-center border border-gray-700">
                  <div className="text-3xl font-bold text-white mb-1">{displayedEventsCount}</div>
                  <div className="text-sm text-gray-400">Total (Exibidos)</div>
                  {lowImpactCount > 0 && (
                    <div className="text-xs text-gray-500 mt-1">+{lowImpactCount} LOW (ocultos)</div>
                  )}
                </div>
                <div className="bg-red-900/20 rounded-lg p-4 text-center border border-red-800/50">
                  <div className="text-3xl font-bold text-red-400 mb-1">{highImpactCount}</div>
                  <div className="text-sm text-red-300">Alto</div>
                </div>
                <div className="bg-orange-900/20 rounded-lg p-4 text-center border border-orange-800/50">
                  <div className="text-3xl font-bold text-orange-400 mb-1">{mediumImpactCount}</div>
                  <div className="text-sm text-orange-300">Médio</div>
                </div>
                <div className="bg-yellow-900/20 rounded-lg p-4 text-center border border-yellow-800/50">
                  <div className="text-3xl font-bold text-yellow-400 mb-1">{lowImpactCount}</div>
                  <div className="text-sm text-yellow-300">Baixo</div>
                </div>
              </div>

              <div className="mb-6">
                <div className="text-sm font-semibold text-gray-400 mb-3">Filtrar por dia (weekday):</div>
                <div className="grid grid-cols-5 gap-2">
                  {dayButtons.map((day) => {
                    const dayData = getDayStats(day.weekday);
                    const hasEvents = dayData.count > 0;
                    const isSelected = selectedDay === day.key;
                    return (
                      <button
                        key={day.key}
                        onClick={() => setSelectedDay(day.key)}
                        className={`
                          py-3 px-4 rounded-lg font-semibold text-sm transition-all
                          flex flex-col items-center justify-center min-h-[70px]
                          ${isSelected
                            ? 'bg-purple-600 text-white shadow-lg scale-105 border-2 border-purple-400'
                            : hasEvents
                              ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                              : 'bg-gray-900 text-gray-600 hover:bg-gray-800 border border-gray-800'}
                        `}
                      >
                        <div className="font-bold mb-1">{day.fullLabel}</div>
                        {dayData.count > 0 && (
                          <div className="text-xs flex items-center gap-1 flex-wrap justify-center">
                            {dayData.high > 0 && (
                              <span className="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold">
                                {dayData.high}H
                              </span>
                            )}
                            {dayData.medium > 0 && (
                              <span className="bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded font-bold">
                                {dayData.medium}M
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="text-center text-sm text-gray-400 mb-4">
                {filteredEvents.length > 0 ? (
                  <>Mostrando {filteredEvents.length} evento{filteredEvents.length !== 1 ? 's' : ''} de {dayButtons.find((d) => d.key === selectedDay)?.fullLabel}</>
                ) : (
                  <span className="text-yellow-400">Sem eventos relevantes</span>
                )}
              </div>

              {sortedEventsForWeek.length > 0 ? (
                <div className="space-y-4">
                  {sortedEventsForWeek.map((event) => {
                    // GARANTIR: usar APENAS event_id canônico como key do React (backend é fonte da verdade)
                    // Se event_id ausente, usar índice como fallback (mas logar warning)
                    const eventKey = event?.event_id;
                    if (!eventKey) {
                      console.warn("RealtimeEventsPanel: evento sem event_id canônico, usando índice como key", event);
                    }
                    return (
                    <EventCardExpanded
                      key={eventKey || `event-index-${sortedEventsForWeek.indexOf(event)}`}
                      event={event}
                      token={token}
                      openEventId={openEventId}
                      onExpandClick={(id) => setOpenEventId((prev) => (prev === id ? null : id))}
                    />
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">Sem eventos relevantes</div>
              )}

                  {snapshotMeta?.rendered_at && (
                    <div className="mt-6 pt-4 border-t border-gray-800 text-xs text-gray-500 text-center">
                      Snapshot: {snapshotMeta.snapshot_id} • Renderizado: {snapshotMeta.rendered_at}
                    </div>
                  )}
                </div>
              ) : (
                !strictError ? (
                  <div className="text-center py-8 text-gray-400">
                    Nenhum evento disponível para esta semana.
                  </div>
                ) : null
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RealtimeEventsPanel;
