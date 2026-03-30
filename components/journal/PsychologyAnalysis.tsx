"use client";

import { useState, useCallback } from "react";
import { Brain, AlertTriangle, Clock, TrendingUp, Shield, Zap, Loader2, RefreshCw } from "lucide-react";
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

interface PsychologyAnalysisProps {
  accountId: string | null;
}

export function PsychologyAnalysis({ accountId }: PsychologyAnalysisProps) {
  const [analysis, setAnalysis] = useState<PsychologyAnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [cached, setCached] = useState(false);

  const fetchAnalysis = useCallback(async (selectedPeriod: PeriodKey) => {
    if (!accountId) return;
    setLoading(true);
    setError(null);
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
        body: JSON.stringify({ account_id: accountId, period: selectedPeriod }),
      });

      const json = await res.json();
      if (!json.ok) {
        setError(json.error || "Erro ao gerar análise.");
        return;
      }

      setAnalysis(json.data);
      setCached(!!json.cached);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  const handlePeriodChange = (p: PeriodKey) => {
    setPeriod(p);
    setAnalysis(null);
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
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                period === p.key
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Generate / Refresh button */}
      {!loading && (
        <div className="flex items-center gap-3">
          <Button
            onClick={() => fetchAnalysis(period)}
            disabled={loading}
            className="gap-2"
          >
            {analysis ? <RefreshCw className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
            {analysis ? "Atualizar Análise" : "Gerar Análise"}
          </Button>
          {cached && (
            <span className="text-[10px] text-muted-foreground">
              Resultado em cache — clique para atualizar
            </span>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16 gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
          <span className="text-sm text-muted-foreground">Analisando seus trades com IA...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-[16px] border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 space-y-3">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAnalysis(period)}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Tentar novamente
          </Button>
        </div>
      )}

      {/* Analysis Results */}
      {analysis && !loading && (
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
