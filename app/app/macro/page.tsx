// app/app/macro/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
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

  const weekStart = getWeekStart();

  const fetchData = useCallback(async () => {
    try {
      const [calRes, panRes, ratesRes, alertsRes, histRes] = await Promise.allSettled([
        fetch(`/api/macro/calendar?week=${weekStart}`),
        fetch(`/api/macro/panorama?week=${weekStart}`),
        fetch("/api/macro/rates"),
        fetch(`/api/macro/alerts?week=${weekStart}`),
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
  }, [weekStart]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleCalendarRefresh = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch("/api/macro/refresh-calendar", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const json = await res.json();
    if (!json.ok) {
      console.error("[macro] Calendar refresh failed:", json.error);
    }

    // Re-fetch calendar data to show updated values
    const calRes = await fetch(`/api/macro/calendar?week=${weekStart}`);
    try {
      const calJson = await calRes.json();
      if (calJson.ok) setEvents(calJson.data || []);
    } catch { /* ignore */ }
  }, [weekStart]);

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
    <div className="mx-auto max-w-6xl px-6 py-10">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Globe className="h-6 w-6 text-blue-500" />
            <h1 className="text-2xl font-semibold tracking-tight">Inteligência Macro</h1>
            <LiveIndicator />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Calendário econômico, narrativas AI e intelligence para traders
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

      <div className="space-y-8">
        {/* Adaptive Alerts */}
        {alerts.length > 0 && <AdaptiveAlerts alerts={alerts} />}

        {/* Economic Calendar — FREE */}
        <section>
          <h2 className="mb-4 text-lg font-semibold tracking-tight">Calendário Econômico</h2>
          <EconomicCalendar events={events} onRefresh={handleCalendarRefresh} />
        </section>

        {/* Weekly Briefing — PRO */}
        <section>
          <h2 className="mb-4 text-lg font-semibold tracking-tight">Visão da Semana</h2>
          <PaywallGate requiredPlan="pro" blurContent>
            <WeeklyBriefing panorama={panorama} />
          </PaywallGate>
        </section>

        {/* Regional Analysis — PRO */}
        <section>
          <h2 className="mb-4 text-lg font-semibold tracking-tight">Análise Regional</h2>
          <PaywallGate requiredPlan="pro" blurContent>
            <RegionalAnalysis data={panorama?.regional_analysis || null} />
          </PaywallGate>
        </section>

        {/* Decision Intelligence — PRO */}
        <section>
          <h2 className="mb-4 text-lg font-semibold tracking-tight">Inteligência de Decisão</h2>
          <PaywallGate requiredPlan="pro" blurContent>
            <DecisionIntelligence data={panorama?.decision_intelligence || null} />
          </PaywallGate>
        </section>

        {/* Interest Rates — PRO */}
        <section>
          <h2 className="mb-4 text-lg font-semibold tracking-tight">Taxas de Juros (Bancos Centrais)</h2>
          <PaywallGate requiredPlan="pro" blurContent>
            <InterestRatesPanel rates={rates} />
          </PaywallGate>
        </section>

        {/* Weekly History — PRO */}
        <section>
          <h2 className="mb-4 text-lg font-semibold tracking-tight">Histórico Semanal</h2>
          <PaywallGate requiredPlan="pro" blurContent>
            <WeeklyHistory weeks={weeks} currentWeek={weekStart} />
          </PaywallGate>
        </section>
      </div>
    </div>
  );
}
