// app/app/macro/page.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Globe, RefreshCw, CalendarDays, FileText, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PaywallGate } from "@/components/billing/PaywallGate";
import { LiveIndicator } from "@/components/macro/LiveIndicator";
import { AdaptiveAlerts } from "@/components/macro/AdaptiveAlerts";
import { HeadlinesFeed } from "@/components/macro/HeadlinesFeed";
import { EconomicCalendar } from "@/components/macro/EconomicCalendar";
import { WeeklyBriefing } from "@/components/macro/WeeklyBriefing";
import { RegionalAnalysis } from "@/components/macro/RegionalAnalysis";
import { DecisionIntelligence } from "@/components/macro/DecisionIntelligence";
import { InterestRatesPanel } from "@/components/macro/InterestRatesPanel";
import { WeeklyHistory } from "@/components/macro/WeeklyHistory";
import { supabase } from "@/lib/supabase/client";
import { getWeekStart } from "@/lib/macro/constants";
import type { EconomicEvent, WeeklyPanorama, CentralBankRate, AdaptiveAlert as AdaptiveAlertType, MacroHeadline } from "@/lib/macro/types";

export default function MacroIntelligencePage() {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [panorama, setPanorama] = useState<WeeklyPanorama | null>(null);
  const [rates, setRates] = useState<CentralBankRate[]>([]);
  const [alerts, setAlerts] = useState<AdaptiveAlertType[]>([]);
  const [headlines, setHeadlines] = useState<MacroHeadline[]>([]);
  const [weeks, setWeeks] = useState<{ week_start: string; week_end: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showRefreshDialog, setShowRefreshDialog] = useState(false);

  // Week navigation: on weekends (Sat/Sun after market close), default to next week
  const currentWeek = getWeekStart();
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun, 6=Sat
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const defaultWeek = isWeekend
    ? (() => { const d = new Date(); d.setDate(d.getDate() + 7); return getWeekStart(d); })()
    : currentWeek;
  const [calendarWeek, setCalendarWeek] = useState(defaultWeek);

  const fetchData = useCallback(async () => {
    try {
      const [calRes, panRes, ratesRes, alertsRes, histRes, hdlRes] = await Promise.allSettled([
        fetch(`/api/macro/calendar?week=${calendarWeek}`),
        fetch(`/api/macro/panorama?week=${defaultWeek}`),
        fetch("/api/macro/rates"),
        fetch(`/api/macro/alerts?week=${defaultWeek}`),
        fetch("/api/macro/history"),
        fetch("/api/macro/headlines?limit=15"),
      ]);

      const safeJson = async (result: PromiseSettledResult<Response>) => {
        if (result.status === "rejected") return { ok: false };
        try { return await result.value.json(); } catch { return { ok: false }; }
      };

      const [calJson, panJson, ratesJson, alertsJson, histJson, hdlJson] = await Promise.all([
        safeJson(calRes),
        safeJson(panRes),
        safeJson(ratesRes),
        safeJson(alertsRes),
        safeJson(histRes),
        safeJson(hdlRes),
      ]);

      if (calJson.ok) setEvents(calJson.data || []);
      if (panJson.ok && panJson.data) {
        const pan = panJson.data;
        // Ensure JSONB fields are parsed (Supabase may return strings in edge cases)
        if (typeof pan.regional_analysis === "string") {
          try { pan.regional_analysis = JSON.parse(pan.regional_analysis); } catch { pan.regional_analysis = null; }
        }
        if (typeof pan.decision_intelligence === "string") {
          try { pan.decision_intelligence = JSON.parse(pan.decision_intelligence); } catch { pan.decision_intelligence = null; }
        }
        if (typeof pan.sentiment === "string") {
          try { pan.sentiment = JSON.parse(pan.sentiment); } catch { pan.sentiment = null; }
        }
        if (typeof pan.market_impacts === "string") {
          try { pan.market_impacts = JSON.parse(pan.market_impacts); } catch { pan.market_impacts = null; }
        }
        setPanorama(pan);
      }
      if (ratesJson.ok) setRates(ratesJson.data || []);
      if (alertsJson.ok) setAlerts(alertsJson.data || []);
      if (hdlJson.ok) setHeadlines(hdlJson.data || []);
      if (histJson.ok) setWeeks(histJson.data || []);
    } catch (error) {
      console.error("[macro] Failed to fetch data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [calendarWeek, defaultWeek]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const REFRESH_COOLDOWN_KEY = "macro_last_full_refresh";
  const REFRESH_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24h

  const getLastRefreshTime = (): number => {
    try { return parseInt(localStorage.getItem(REFRESH_COOLDOWN_KEY) || "0", 10); }
    catch { return 0; }
  };

  const handleRefreshClick = () => {
    setShowRefreshDialog(true);
  };

  const handleRefreshConfirm = async () => {
    setShowRefreshDialog(false);

    const lastRefresh = getLastRefreshTime();
    const now = Date.now();
    if (now - lastRefresh < REFRESH_COOLDOWN_MS) {
      const hoursAgo = Math.round((now - lastRefresh) / (60 * 60 * 1000));
      alert(`Atualização já realizada há ${hoursAgo}h. Aguarde 24h entre atualizações.`);
      return;
    }

    setRefreshing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = { Authorization: `Bearer ${session.access_token}` };

      // Run rates first (fast, ~10s), calendar in background (can be slow)
      const ratesResult = await Promise.race([
        fetch("/api/macro/refresh-rates", { method: "POST", headers }),
        new Promise<Response>((_, reject) => setTimeout(() => reject(new Error("timeout")), 55000)),
      ]).catch(() => null);

      if (ratesResult && ratesResult.ok) {
        console.log("[macro] Rates refreshed successfully");
      }

      // Refresh data immediately after rates (user sees updated rates fast)
      await fetchData();

      // Calendar refresh in background (don't block UI)
      fetch("/api/macro/refresh-calendar", { method: "POST", headers })
        .then(async (res) => {
          if (res.ok) {
            console.log("[macro] Calendar refreshed, reloading data...");
            await fetchData(); // Auto-refresh page with new calendar data
          }
        })
        .catch((err) => console.warn("[macro] Calendar refresh failed:", err));

      localStorage.setItem(REFRESH_COOLDOWN_KEY, String(Date.now()));
    } catch (err) {
      console.error("[macro] Full refresh failed:", err);
    } finally {
      setRefreshing(false);
    }
  };

  // Calendar-specific refresh (fetches latest from Faireconomy)
  const handleCalendarRefresh = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Determine if we need the next-week URL
    const nextWeekDate = new Date();
    nextWeekDate.setDate(nextWeekDate.getDate() + 7);
    const nextWeek = getWeekStart(nextWeekDate);
    const weekParam = calendarWeek === nextWeek ? "next" : "";

    const url = weekParam
      ? `/api/macro/refresh-calendar?week=${weekParam}`
      : "/api/macro/refresh-calendar";

    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const json = await res.json();
    if (!json.ok) {
      console.error("[macro] Calendar refresh failed:", json.error);
    }

    // Re-fetch calendar data to show updated values
    const calRes = await fetch(`/api/macro/calendar?week=${calendarWeek}`);
    try {
      const calJson = await calRes.json();
      if (calJson.ok) setEvents(calJson.data || []);
    } catch { /* ignore */ }
  }, [calendarWeek]);

  // Regenerate weekly report via Claude
  const handleRegenerate = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch("/api/macro/regenerate-report", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ week: defaultWeek }),
    });
    const json = await res.json();
    if (!json.ok) {
      console.error("[macro] Report regeneration failed:", json.error);
      return;
    }

    // Refetch panorama to show updated data
    const panRes = await fetch(`/api/macro/panorama?week=${defaultWeek}`);
    try {
      const panJson = await panRes.json();
      if (panJson.ok && panJson.data) {
        const pan = panJson.data;
        if (typeof pan.regional_analysis === "string") {
          try { pan.regional_analysis = JSON.parse(pan.regional_analysis); } catch { pan.regional_analysis = null; }
        }
        if (typeof pan.decision_intelligence === "string") {
          try { pan.decision_intelligence = JSON.parse(pan.decision_intelligence); } catch { pan.decision_intelligence = null; }
        }
        if (typeof pan.sentiment === "string") {
          try { pan.sentiment = JSON.parse(pan.sentiment); } catch { pan.sentiment = null; }
        }
        if (typeof pan.market_impacts === "string") {
          try { pan.market_impacts = JSON.parse(pan.market_impacts); } catch { pan.market_impacts = null; }
        }
        setPanorama(pan);
      }
    } catch { /* ignore */ }
  }, [defaultWeek]);

  // Headlines manual refresh
  const handleHeadlinesRefresh = useCallback(async () => {
    try {
      const res = await fetch("/api/macro/headlines?limit=15");
      const json = await res.json();
      if (json.ok) setHeadlines(json.data || []);
    } catch (err) {
      console.error("[macro] Headlines refresh failed:", err);
    }
  }, []);

  // Handle week change from calendar navigation
  const handleWeekChange = useCallback(async (newWeek: string) => {
    setCalendarWeek(newWeek);
    // Fetch calendar events for the new week
    try {
      const calRes = await fetch(`/api/macro/calendar?week=${newWeek}`);
      const calJson = await calRes.json();
      if (calJson.ok) setEvents(calJson.data || []);
    } catch {
      setEvents([]);
    }
  }, []);

  // Poll for actual values during market hours (Mon-Fri, 12:00-22:00 UTC)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    // Only poll when viewing current week
    if (calendarWeek !== currentWeek) return;

    pollRef.current = setInterval(() => {
      const now = new Date();
      const day = now.getUTCDay();
      const hour = now.getUTCHours();
      // Mon-Fri, 12:00-22:00 UTC covers major market hours
      if (day >= 1 && day <= 5 && hour >= 12 && hour <= 22) {
        handleCalendarRefresh();
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [calendarWeek, currentWeek, handleCalendarRefresh]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-[22px]"
              style={{ backgroundColor: "hsl(var(--card))" }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none px-4 sm:px-6 lg:px-8 py-8 h-full flex flex-col">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Globe className="h-6 w-6 text-blue-500" />
            <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">Inteligência Macro</h1>
            <LiveIndicator />
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            Terminal quantitativo, calendário econômico e narrativas macro geradas por IA.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefreshClick}
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Atualizando..." : "Atualizar"}
        </Button>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showRefreshDialog} onOpenChange={setShowRefreshDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Atualização Completa
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Esta ação busca dados atualizados de múltiplas fontes e consome recursos externos.
                  <strong className="text-foreground"> Limite: 1x por dia.</strong>
                </p>
                <div className="rounded-lg border border-border/60 p-3 space-y-1.5">
                  <p className="font-medium text-foreground text-xs uppercase tracking-widest">O que será atualizado:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Taxas de juros dos bancos centrais (via TradingEconomics)</li>
                    <li>Calendário econômico — Previous, Forecast e Actual (via Investing.com)</li>
                    <li>Backfill de dados da semana anterior</li>
                  </ul>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowRefreshDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRefreshConfirm}>
              Sim, atualizar agora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adaptive Alerts - Always visible */}
      {alerts.length > 0 && (
        <div className="w-full mb-6">
          <AdaptiveAlerts alerts={alerts} />
        </div>
      )}

      {/* Headlines Feed */}
      <div className="w-full mb-6">
        <HeadlinesFeed
          headlines={headlines}
          onRefresh={handleHeadlinesRefresh}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="terminal" className="flex-1 flex flex-col min-h-0">
        <TabsList className="self-start mb-6 h-11">
          <TabsTrigger value="terminal" className="gap-2 px-4">
            <CalendarDays className="h-4 w-4" />
            Terminal
          </TabsTrigger>
          <TabsTrigger value="report" className="gap-2 px-4">
            <FileText className="h-4 w-4" />
            Relatório Macro
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Terminal — Calendar, Rates */}
        <TabsContent value="terminal" className="flex-1 min-h-0 mt-0">
          <div className="flex flex-col gap-6">
            {/* Calendar & Rates */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
              {/* Economic Calendar */}
              <section className="xl:col-span-8 flex flex-col rounded-[28px] border border-border/40 bg-card shadow-sm overflow-hidden relative isolate p-6">
                <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                  Calendário Econômico
                </h2>
                <div className="flex-1 min-h-[400px]">
                  <EconomicCalendar
                    events={events}
                    weekStart={calendarWeek}
                    onWeekChange={handleWeekChange}
                    onRefresh={handleCalendarRefresh}
                  />
                </div>
              </section>

              {/* Interest Rates */}
              <section className="xl:col-span-4 flex flex-col rounded-[28px] border border-border/40 bg-card shadow-sm overflow-hidden relative isolate p-6">
                <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Taxas Baseadas (Bancos Centrais)</h2>
                <PaywallGate requiredPlan="pro" blurContent>
                  <InterestRatesPanel rates={rates} />
                </PaywallGate>
              </section>
            </div>

            {/* Weekly History */}
            <section className="w-full flex flex-col rounded-[24px] border border-border/40 bg-card shadow-sm p-6">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Histórico Macro Semanal</h2>
              <PaywallGate requiredPlan="pro" blurContent>
                <WeeklyHistory weeks={weeks} currentWeek={currentWeek} />
              </PaywallGate>
            </section>
          </div>
        </TabsContent>

        {/* Tab 2: Relatório Macro — Full AI Report */}
        <TabsContent value="report" className="flex-1 min-h-0 mt-0">
          <div className="flex flex-col gap-6">
            {/* Weekly Briefing — expanded, no collapse */}
            <section className="w-full rounded-[28px] border border-border/40 bg-card shadow-sm overflow-hidden relative isolate px-6 py-5">
              <WeeklyBriefing panorama={panorama} onRegenerate={handleRegenerate} defaultExpanded />
            </section>

            {/* Regional Analysis */}
            <section className="w-full flex flex-col rounded-[24px] border border-border/40 bg-card shadow-sm p-6">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
                Análise Regional
              </h2>
              <PaywallGate requiredPlan="pro" blurContent>
                <RegionalAnalysis data={panorama?.regional_analysis || null} />
              </PaywallGate>
            </section>

            {/* Decision Intelligence */}
            <section className="w-full flex flex-col rounded-[24px] border border-border/40 bg-card shadow-sm p-6">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                Inteligência de Decisão
              </h2>
              <PaywallGate requiredPlan="pro" blurContent>
                <DecisionIntelligence data={panorama?.decision_intelligence || null} />
              </PaywallGate>
            </section>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
