// app/app/macro/page.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Globe, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaywallGate } from "@/components/billing/PaywallGate";
import { LiveIndicator } from "@/components/macro/LiveIndicator";
import { AdaptiveAlerts } from "@/components/macro/AdaptiveAlerts";
import { EconomicCalendar } from "@/components/macro/EconomicCalendar";
import { WeeklyBriefing } from "@/components/macro/WeeklyBriefing";
import { RegionalAnalysis } from "@/components/macro/RegionalAnalysis";
import { DecisionIntelligence } from "@/components/macro/DecisionIntelligence";
import { InterestRatesPanel } from "@/components/macro/InterestRatesPanel";
import { WeeklyHistory } from "@/components/macro/WeeklyHistory";
import { supabase } from "@/lib/supabase/client";
import { getWeekStart } from "@/lib/macro/constants";
import type { EconomicEvent, WeeklyPanorama, CentralBankRate, AdaptiveAlert as AdaptiveAlertType } from "@/lib/macro/types";

export default function MacroIntelligencePage() {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [panorama, setPanorama] = useState<WeeklyPanorama | null>(null);
  const [rates, setRates] = useState<CentralBankRate[]>([]);
  const [alerts, setAlerts] = useState<AdaptiveAlertType[]>([]);
  const [weeks, setWeeks] = useState<{ week_start: string; week_end: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Week navigation: start with current week
  const currentWeek = getWeekStart();
  const [calendarWeek, setCalendarWeek] = useState(currentWeek);

  const fetchData = useCallback(async () => {
    try {
      const [calRes, panRes, ratesRes, alertsRes, histRes] = await Promise.allSettled([
        fetch(`/api/macro/calendar?week=${calendarWeek}`),
        fetch(`/api/macro/panorama?week=${currentWeek}`),
        fetch("/api/macro/rates"),
        fetch(`/api/macro/alerts?week=${currentWeek}`),
        fetch("/api/macro/history"),
      ]);

      const safeJson = async (result: PromiseSettledResult<Response>) => {
        if (result.status === "rejected") return { ok: false };
        try { return await result.value.json(); } catch { return { ok: false }; }
      };

      const [calJson, panJson, ratesJson, alertsJson, histJson] = await Promise.all([
        safeJson(calRes),
        safeJson(panRes),
        safeJson(ratesRes),
        safeJson(alertsRes),
        safeJson(histRes),
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
      if (histJson.ok) setWeeks(histJson.data || []);
    } catch (error) {
      console.error("[macro] Failed to fetch data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [calendarWeek, currentWeek]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
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
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
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
          onClick={handleRefresh}
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      <div className="flex flex-col gap-6 flex-1 min-h-0">
        {/* Adaptive Alerts - Top Full Width */}
        {alerts.length > 0 && (
          <div className="w-full">
            <AdaptiveAlerts alerts={alerts} />
          </div>
        )}

        {/* Row 1: Calendar & Rates */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          {/* Economic Calendar */}
          <section className="xl:col-span-8 flex flex-col rounded-[28px] border border-border/50 bg-card/60 shadow-soft dark:shadow-soft-dark overflow-hidden backdrop-blur-3xl relative isolate p-6">
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
          <section className="xl:col-span-4 flex flex-col rounded-[28px] border border-border/50 bg-card/60 shadow-soft dark:shadow-soft-dark overflow-hidden backdrop-blur-3xl relative isolate p-6">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Taxas Baseadas (Bancos Centrais)</h2>
            <PaywallGate requiredPlan="pro" blurContent>
              <InterestRatesPanel rates={rates} />
            </PaywallGate>
          </section>
        </div>

        {/* Row 2: Weekly Briefing */}
        <section className="w-full rounded-[28px] border border-border/50 bg-card/60 shadow-soft dark:shadow-soft-dark overflow-hidden backdrop-blur-3xl relative isolate px-6 py-5">
           <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] -z-10 pointer-events-none" />
           <WeeklyBriefing panorama={panorama} />
        </section>

        {/* Row 3: Regional Analysis */}
        <section className="w-full flex flex-col rounded-[24px] border border-border/40 bg-card/40 backdrop-blur-xl p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
            Análise Regional
          </h2>
          <PaywallGate requiredPlan="pro" blurContent>
            <RegionalAnalysis data={panorama?.regional_analysis || null} />
          </PaywallGate>
        </section>

        {/* Row 4: Decision Intelligence */}
        <section className="w-full flex flex-col rounded-[24px] border border-border/40 bg-card/40 backdrop-blur-xl p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            Inteligência de Decisão
          </h2>
          <PaywallGate requiredPlan="pro" blurContent>
            <DecisionIntelligence data={panorama?.decision_intelligence || null} />
          </PaywallGate>
        </section>

        {/* Row 5: Weekly History */}
        <section className="w-full flex flex-col rounded-[24px] border border-border/40 bg-card/40 backdrop-blur-xl p-6">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Histórico Macro Semanal</h2>
          <PaywallGate requiredPlan="pro" blurContent>
            <WeeklyHistory weeks={weeks} currentWeek={currentWeek} />
          </PaywallGate>
        </section>
      </div>
    </div>
  );
}
