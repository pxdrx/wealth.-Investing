"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface SourceValues {
  previous: string | null;
  forecast: string | null;
  actual: string | null;
}

interface AuditEventRow {
  event_id: string;
  event_uid: string;
  title: string;
  date: string;
  time: string | null;
  country: string;
  impact: "high" | "medium" | "low";
  db: SourceValues;
  ff: SourceValues | null;
  te: SourceValues | null;
  ic: SourceValues | null;
  disagreements: ("previous" | "forecast" | "actual")[];
  recommendation: "ok" | "ff_wins" | "te_wins" | "ic_wins" | "manual";
}

interface CalendarReport {
  weekStart: string;
  weekEnd: string;
  eventCount: number;
  rows: AuditEventRow[];
  sourcesAvailable: { ff: boolean; te: boolean; ic: boolean };
  generatedAt: string;
}

interface RateRow {
  bank_code: string;
  bank_name: string;
  country: string;
  db: {
    current_rate: number;
    last_action: string | null;
    last_change_bps: number | null;
    last_change_date: string | null;
    updated_at: string;
  };
  te: { current_rate: number } | null;
  flags: { mismatch_rate: boolean; stale: boolean; stale_change_date: boolean };
}

interface RateReport {
  rows: RateRow[];
  teAvailable: boolean;
  generatedAt: string;
}

async function apiFetch(path: string, options?: RequestInit) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Sessão expirada");
  const res = await fetch(path, {
    ...options,
    headers: {
      ...options?.headers,
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
  });
  const json = await res.json();
  if (!res.ok || !json.ok) throw new Error(json.error ?? "Erro");
  return json;
}

function getCurrentWeekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function SourceCell({
  values,
  highlightFields,
}: {
  values: SourceValues | null;
  highlightFields: Set<string>;
}) {
  if (!values) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-col text-xs gap-0.5">
      <span className={cn(highlightFields.has("previous") && "font-semibold text-amber-600")}>
        prev: {values.previous ?? "—"}
      </span>
      <span className={cn(highlightFields.has("forecast") && "font-semibold text-amber-600")}>
        fcst: {values.forecast ?? "—"}
      </span>
      <span className={cn(highlightFields.has("actual") && "font-semibold text-amber-600")}>
        act: {values.actual ?? "—"}
      </span>
    </div>
  );
}

export default function MacroAuditPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [resyncing, setResyncing] = useState(false);
  const [week, setWeek] = useState<string>(getCurrentWeekStart());
  const [calendar, setCalendar] = useState<CalendarReport | null>(null);
  const [rates, setRates] = useState<RateReport | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(
    async (weekArg: string) => {
      setLoading(true);
      setMsg(null);
      try {
        const res = await apiFetch(`/api/admin/macro-audit?week=${weekArg}`);
        setCalendar(res.calendar);
        setRates(res.rates);
      } catch (e) {
        setMsg((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await apiFetch("/api/admin/me");
        if (cancelled) return;
        if (!me.isAdmin) {
          setIsAdmin(false);
          setLoading(false);
          return;
        }
        setIsAdmin(true);
        await load(week);
      } catch {
        if (!cancelled) setIsAdmin(false);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resync = useCallback(async () => {
    setResyncing(true);
    setMsg(null);
    try {
      await apiFetch("/api/cron/calendar-sync", { method: "POST" });
      await apiFetch("/api/cron/rates-sync", { method: "POST" });
      await load(week);
      setMsg("Re-sync concluído.");
    } catch (e) {
      setMsg(`Re-sync falhou: ${(e as Error).message}`);
    } finally {
      setResyncing(false);
    }
  }, [week, load]);

  const applyFix = useCallback(
    async (row: AuditEventRow, src: "ff" | "te" | "ic") => {
      const srcVals = src === "ff" ? row.ff : src === "te" ? row.te : row.ic;
      if (!srcVals) return;
      const patch: Record<string, string | null> = {};
      for (const f of row.disagreements) patch[f] = srcVals[f];
      try {
        await apiFetch("/api/admin/macro-audit", {
          method: "POST",
          body: JSON.stringify({ kind: "event", event_id: row.event_id, patch }),
        });
        setMsg(`Atualizado ${row.title} com ${src.toUpperCase()}.`);
        await load(week);
      } catch (e) {
        setMsg(`Erro: ${(e as Error).message}`);
      }
    },
    [week, load]
  );

  const applyRateFix = useCallback(
    async (r: RateRow) => {
      if (!r.te) return;
      try {
        await apiFetch("/api/admin/macro-audit", {
          method: "POST",
          body: JSON.stringify({
            kind: "rate",
            bank_code: r.bank_code,
            patch: { current_rate: r.te.current_rate },
          }),
        });
        setMsg(`Taxa ${r.bank_code} atualizada para ${r.te.current_rate}%`);
        await load(week);
      } catch (e) {
        setMsg(`Erro: ${(e as Error).message}`);
      }
    },
    [week, load]
  );

  if (loading && isAdmin === null) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Card
          className="p-8 flex flex-col items-center gap-3"
          style={{ backgroundColor: "hsl(var(--card))" }}
        >
          <ShieldAlert className="h-8 w-8 text-red-500" />
          <p className="text-sm text-muted-foreground">Acesso negado.</p>
        </Card>
      </div>
    );
  }

  const problems = (calendar?.rows ?? []).filter((r) => r.disagreements.length > 0);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Macro Audit</h1>
          <p className="text-sm text-muted-foreground">
            Cruza DB × Faireconomy × TradingEconomics × Investing.com
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={week}
            onChange={(e) => setWeek(e.target.value)}
            className="rounded-[12px] border px-3 py-1.5 text-sm"
          />
          <button
            className="rounded-full px-3 py-1.5 text-sm border hover:bg-muted"
            onClick={() => load(week)}
            disabled={loading}
          >
            {loading ? "Carregando..." : "Auditar"}
          </button>
          <button
            className="rounded-full px-3 py-1.5 text-sm border hover:bg-muted flex items-center gap-1"
            onClick={resync}
            disabled={resyncing}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", resyncing && "animate-spin")} />
            Re-sync
          </button>
        </div>
      </div>

      {msg && (
        <div className="rounded-[12px] border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm">
          {msg}
        </div>
      )}

      {calendar && (
        <Card className="p-4" style={{ backgroundColor: "hsl(var(--card))" }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">
              Calendário · semana {calendar.weekStart} → {calendar.weekEnd}
            </h2>
            <div className="text-xs text-muted-foreground">
              {calendar.eventCount} eventos · {problems.length} divergências · FF{" "}
              {calendar.sourcesAvailable.ff ? "✓" : "✗"} · TE{" "}
              {calendar.sourcesAvailable.te ? "✓" : "✗"} · IC{" "}
              {calendar.sourcesAvailable.ic ? "✓" : "✗"}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b">
                  <th className="py-2 pr-2">Data</th>
                  <th className="py-2 pr-2">País</th>
                  <th className="py-2 pr-2">Impacto</th>
                  <th className="py-2 pr-2">Título</th>
                  <th className="py-2 pr-2">DB</th>
                  <th className="py-2 pr-2">FF</th>
                  <th className="py-2 pr-2">TE</th>
                  <th className="py-2 pr-2">IC</th>
                  <th className="py-2 pr-2">Ação</th>
                </tr>
              </thead>
              <tbody>
                {calendar.rows.map((r) => {
                  const hl = new Set(r.disagreements);
                  const bad = r.disagreements.length > 0;
                  return (
                    <tr
                      key={r.event_id}
                      className={cn("border-b align-top", bad && "bg-amber-500/5")}
                    >
                      <td className="py-2 pr-2 whitespace-nowrap">
                        {r.date} {r.time ?? ""}
                      </td>
                      <td className="py-2 pr-2">{r.country}</td>
                      <td className="py-2 pr-2 text-xs uppercase">{r.impact}</td>
                      <td className="py-2 pr-2 max-w-[220px]">{r.title}</td>
                      <td className="py-2 pr-2">
                        <SourceCell values={r.db} highlightFields={hl} />
                      </td>
                      <td className="py-2 pr-2">
                        <SourceCell values={r.ff} highlightFields={hl} />
                      </td>
                      <td className="py-2 pr-2">
                        <SourceCell values={r.te} highlightFields={hl} />
                      </td>
                      <td className="py-2 pr-2">
                        <SourceCell values={r.ic} highlightFields={hl} />
                      </td>
                      <td className="py-2 pr-2">
                        {bad && (
                          <div className="flex flex-col gap-1">
                            {r.ff && (
                              <button
                                className="text-xs rounded-full border px-2 py-0.5 hover:bg-muted"
                                onClick={() => applyFix(r, "ff")}
                              >
                                Aplicar FF
                              </button>
                            )}
                            {r.te && (
                              <button
                                className="text-xs rounded-full border px-2 py-0.5 hover:bg-muted"
                                onClick={() => applyFix(r, "te")}
                              >
                                Aplicar TE
                              </button>
                            )}
                            {r.ic && (
                              <button
                                className="text-xs rounded-full border px-2 py-0.5 hover:bg-muted"
                                onClick={() => applyFix(r, "ic")}
                              >
                                Aplicar IC
                              </button>
                            )}
                            <span className="text-[10px] text-muted-foreground">
                              rec: {r.recommendation}
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {rates && (
        <Card className="p-4" style={{ backgroundColor: "hsl(var(--card))" }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Taxas de juros</h2>
            <div className="text-xs text-muted-foreground">
              TE {rates.teAvailable ? "✓" : "✗"}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {rates.rows.map((r) => {
              const hasIssue = r.flags.mismatch_rate || r.flags.stale || r.flags.stale_change_date;
              return (
                <div
                  key={r.bank_code}
                  className={cn(
                    "rounded-[12px] border p-3 text-sm",
                    hasIssue && "ring-1 ring-amber-500/50"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{r.bank_code}</span>
                    <span className="text-xs text-muted-foreground">{r.country}</span>
                  </div>
                  <div className="mt-1 text-lg font-bold">{r.db.current_rate}%</div>
                  {r.te && (
                    <div
                      className={cn(
                        "text-xs",
                        r.flags.mismatch_rate ? "text-amber-600 font-semibold" : "text-muted-foreground"
                      )}
                    >
                      TE: {r.te.current_rate}%
                    </div>
                  )}
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    {r.db.last_action ?? "—"} · {r.db.last_change_date ?? "—"}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1 text-[10px]">
                    {r.flags.mismatch_rate && (
                      <span className="rounded-full bg-red-500/10 text-red-600 px-1.5 py-0.5">
                        mismatch
                      </span>
                    )}
                    {r.flags.stale && (
                      <span className="rounded-full bg-amber-500/10 text-amber-600 px-1.5 py-0.5">
                        stale
                      </span>
                    )}
                    {r.flags.stale_change_date && (
                      <span className="rounded-full bg-zinc-500/10 text-zinc-600 px-1.5 py-0.5">
                        6m+
                      </span>
                    )}
                  </div>
                  {r.flags.mismatch_rate && r.te && (
                    <button
                      className="mt-2 w-full text-xs rounded-full border px-2 py-0.5 hover:bg-muted"
                      onClick={() => applyRateFix(r)}
                    >
                      Aplicar TE
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
