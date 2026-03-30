"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Brain, AlertTriangle, Clock, TrendingUp, Shield, Zap, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface PsychologyAnalysisData {
  profile: string;
  critical_hours: string;
  revenge_analysis: string;
  consistency: string;
  alerts: string[];
  strength: string;
}

type PeriodKey = "7d" | "30d" | "90d" | "all";

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
  { key: "90d", label: "90 dias" },
  { key: "all", label: "Tudo" },
];

// Progress bar steps with simulated timing
const PROGRESS_STEPS = [
  { pct: 10, label: "Coletando trades..." },
  { pct: 25, label: "Calculando métricas..." },
  { pct: 45, label: "Analisando padrões de comportamento..." },
  { pct: 65, label: "Detectando revenge trading..." },
  { pct: 80, label: "Gerando perfil psicológico com IA..." },
  { pct: 95, label: "Finalizando análise..." },
];

interface PsychologyAnalysisProps {
  accountId: string | null;
}

export function PsychologyAnalysis({ accountId }: PsychologyAnalysisProps) {
  const [analysis, setAnalysis] = useState<PsychologyAnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [dailyLimitReached, setDailyLimitReached] = useState(false);

  // Progress bar state
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const progressTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearProgressTimers = useCallback(() => {
    for (const t of progressTimers.current) clearTimeout(t);
    progressTimers.current = [];
  }, []);

  const startProgress = useCallback(() => {
    setProgress(0);
    setProgressLabel(PROGRESS_STEPS[0].label);
    clearProgressTimers();

    // Schedule each step with increasing delays
    const delays = [300, 1500, 3500, 6000, 9000, 14000];
    for (let i = 0; i < PROGRESS_STEPS.length; i++) {
      const timer = setTimeout(() => {
        setProgress(PROGRESS_STEPS[i].pct);
        setProgressLabel(PROGRESS_STEPS[i].label);
      }, delays[i]);
      progressTimers.current.push(timer);
    }
  }, [clearProgressTimers]);

  const finishProgress = useCallback(() => {
    clearProgressTimers();
    setProgress(100);
    setProgressLabel("Análise concluída!");
    const timer = setTimeout(() => {
      setProgress(0);
      setProgressLabel("");
    }, 800);
    progressTimers.current.push(timer);
  }, [clearProgressTimers]);

  // Fetch analysis (force = true bypasses cache)
  const fetchAnalysis = useCallback(async (selectedPeriod: PeriodKey, force = false) => {
    if (!accountId) return;
    setLoading(true);
    setError(null);
    if (force) startProgress();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError("Sessão expirada.");
        return;
      }

      const res = await fetch("/api/ai/psychology", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ account_id: accountId, period: selectedPeriod, force }),
      });

      const json = await res.json();
      if (!json.ok) {
        if (json.daily_limit_reached) setDailyLimitReached(true);
        setError(json.error || "Erro ao gerar análise.");
        return;
      }

      setAnalysis(json.data);
      setGeneratedAt(json.generated_at || null);
      setStale(!!json.stale);
      if (force) finishProgress();
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
      if (!force) {
        clearProgressTimers();
        setProgress(0);
        setProgressLabel("");
      }
    }
  }, [accountId, startProgress, finishProgress, clearProgressTimers]);

  // Auto-load saved analysis on mount and when account/period changes
  const lastLoadKey = useRef("");
  useEffect(() => {
    if (!accountId) return;
    const key = `${accountId}_${period}`;
    if (lastLoadKey.current === key) return;
    lastLoadKey.current = key;

    setAnalysis(null);
    setGeneratedAt(null);
    setStale(false);
    setInitialLoading(true);

    fetchAnalysis(period, false).finally(() => setInitialLoading(false));
  }, [accountId, period, fetchAnalysis]);

  const handlePeriodChange = (p: PeriodKey) => {
    setPeriod(p);
  };

  // Format relative time
  const formatGeneratedAt = (iso: string): string => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Agora";
    if (mins < 60) return `Há ${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Há ${hours}h`;
    const days = Math.floor(hours / 24);
    return `Há ${days}d`;
  };

  if (!accountId) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        Selecione uma conta para ver a análise psicológica.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header + Period selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-indigo-500" />
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Análise Psicológica
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => handlePeriodChange(p.key)}
              disabled={loading}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                period === p.key
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
                loading && "opacity-50 cursor-not-allowed"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Generate / Refresh button */}
      {!loading && !initialLoading && (
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            onClick={() => fetchAnalysis(period, true)}
            disabled={loading || dailyLimitReached}
            variant={analysis ? "outline" : "default"}
            className="gap-2"
          >
            {analysis ? <RefreshCw className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
            {dailyLimitReached ? "Limite diário atingido" : analysis ? "Refazer Análise" : "Gerar Análise"}
          </Button>
          {generatedAt && (
            <span className={cn(
              "text-[11px]",
              stale ? "text-amber-500" : "text-muted-foreground"
            )}>
              {stale && "Análise desatualizada — "}
              {formatGeneratedAt(generatedAt)}
            </span>
          )}
        </div>
      )}

      {/* Progress Bar */}
      {loading && progress > 0 && (
        <div className="space-y-2">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{progressLabel}</span>
            <span className="text-xs font-medium text-indigo-500">{progress}%</span>
          </div>
        </div>
      )}

      {/* Initial loading (fetching saved analysis) */}
      {initialLoading && !loading && (
        <div className="flex items-center justify-center py-8 gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <span className="text-xs text-muted-foreground">Carregando análise salva...</span>
        </div>
      )}

      {/* Loading without progress (cache fetch) */}
      {loading && progress === 0 && (
        <div className="flex items-center justify-center py-8 gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <span className="text-xs text-muted-foreground">Buscando análise...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-[16px] border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 space-y-3">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAnalysis(period, true)}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Tentar novamente
          </Button>
        </div>
      )}

      {/* Analysis Results */}
      {analysis && !loading && !initialLoading && (
        <div className="space-y-4">
          {/* Profile */}
          <AnalysisCard
            icon={<Brain className="h-4 w-4 text-indigo-500" />}
            title="Perfil Psicológico"
            content={analysis.profile}
          />

          {/* Critical Hours */}
          <AnalysisCard
            icon={<Clock className="h-4 w-4 text-amber-500" />}
            title="Horários Críticos"
            content={analysis.critical_hours}
          />

          {/* Revenge Trading */}
          <AnalysisCard
            icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
            title="Revenge Trading"
            content={analysis.revenge_analysis}
          />

          {/* Consistency */}
          <AnalysisCard
            icon={<TrendingUp className="h-4 w-4 text-blue-500" />}
            title="Consistência"
            content={analysis.consistency}
          />

          {/* Alerts */}
          {analysis.alerts && analysis.alerts.length > 0 && (
            <div
              className="rounded-[22px] border border-red-200/60 dark:border-red-800/40 p-5 isolate"
              style={{ backgroundColor: "hsl(var(--card))" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <h4 className="text-xs font-bold uppercase tracking-widest text-red-600 dark:text-red-400">
                  Alertas
                </h4>
              </div>
              <ul className="space-y-2">
                {analysis.alerts.map((alert, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm leading-relaxed">
                    <span className="shrink-0 mt-1 h-1.5 w-1.5 rounded-full bg-red-500" />
                    {alert}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Strength */}
          <AnalysisCard
            icon={<Shield className="h-4 w-4 text-emerald-500" />}
            title="Ponto Forte"
            content={analysis.strength}
            accent="emerald"
          />
        </div>
      )}

      {/* No analysis yet (not loading, no error, no data) */}
      {!analysis && !loading && !initialLoading && !error && (
        <div className="text-center py-10 text-muted-foreground text-sm">
          Nenhuma análise salva para este período. Clique em <strong>Gerar Análise</strong> para começar.
        </div>
      )}
    </div>
  );
}

function AnalysisCard({
  icon,
  title,
  content,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  content: string;
  accent?: "emerald";
}) {
  const borderClass = accent === "emerald"
    ? "border-emerald-200/60 dark:border-emerald-800/40"
    : "border-border/40";

  return (
    <div
      className={cn("rounded-[22px] border p-5 isolate", borderClass)}
      style={{ backgroundColor: "hsl(var(--card))" }}
    >
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {title}
        </h4>
      </div>
      <p className="text-sm leading-relaxed text-foreground">{content}</p>
    </div>
  );
}
