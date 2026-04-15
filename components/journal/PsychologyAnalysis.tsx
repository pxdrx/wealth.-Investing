"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Brain, AlertTriangle, Clock, TrendingUp, Shield, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { PsychologyLoadingAnimation } from "./PsychologyLoadingAnimation";

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
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  // Fetch automático — servidor decide se devolve cache do dia ou gera nova
  const fetchAnalysis = useCallback(async (selectedPeriod: PeriodKey) => {
    if (!accountId) return;
    setLoading(true);
    setError(null);
    setAnalysis(null);
    setGeneratedAt(null);

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
      setGeneratedAt(json.generated_at || null);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  // Auto-load ao montar e quando account/período mudar
  const lastLoadKey = useRef("");
  useEffect(() => {
    if (!accountId) return;
    const key = `${accountId}_${period}`;
    if (lastLoadKey.current === key) return;
    lastLoadKey.current = key;
    fetchAnalysis(period);
  }, [accountId, period, fetchAnalysis]);

  const handlePeriodChange = (p: PeriodKey) => {
    if (loading) return;
    setPeriod(p);
  };

  // Formato relativo (Há 2h, Há 30min, etc)
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
      {/* Header + seletor de período */}
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

      {/* Loading animado (CpuArchitecture + mensagens rotativas) */}
      {loading && <PsychologyLoadingAnimation />}

      {/* Erro */}
      {!loading && error && (
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

      {/* Análise pronta */}
      {analysis && !loading && (
        <>
          {generatedAt && (
            <div className="text-[11px] text-muted-foreground">
              Análise do dia · {formatGeneratedAt(generatedAt)}
            </div>
          )}

          <div className="space-y-4">
            <AnalysisCard
              icon={<Brain className="h-4 w-4 text-indigo-500" />}
              title="Perfil Psicológico"
              content={analysis.profile}
            />

            <AnalysisCard
              icon={<Clock className="h-4 w-4 text-amber-500" />}
              title="Horários Críticos"
              content={analysis.critical_hours}
            />

            <AnalysisCard
              icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
              title="Revenge Trading"
              content={analysis.revenge_analysis}
            />

            <AnalysisCard
              icon={<TrendingUp className="h-4 w-4 text-blue-500" />}
              title="Consistência"
              content={analysis.consistency}
            />

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

            <AnalysisCard
              icon={<Shield className="h-4 w-4 text-emerald-500" />}
              title="Ponto Forte"
              content={analysis.strength}
              accent="emerald"
            />
          </div>
        </>
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
