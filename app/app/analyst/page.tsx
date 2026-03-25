"use client";

import { useState } from "react";
import {
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Shield,
  Newspaper,
  Globe,
  Target,
  Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { PaywallGate } from "@/components/billing/PaywallGate";

interface AnalysisSectionData {
  title: string;
  content: string;
  bias?: "bullish" | "bearish" | "neutral";
  confidence?: "alta" | "media" | "baixa";
}

interface AnalysisReport {
  ticker: string;
  assetType: string;
  generatedAt: string;
  sections: {
    macro: AnalysisSectionData;
    technical: AnalysisSectionData;
    fundamental: AnalysisSectionData;
    sentiment: AnalysisSectionData;
    risk: AnalysisSectionData;
  };
  verdict: {
    bias: "bullish" | "bearish" | "neutral";
    confidence: "alta" | "media" | "baixa";
    summary: string;
    keyLevels: string[];
    tradeIdea: string;
  };
}

const SECTION_CONFIG = [
  { key: "macro", icon: Globe, label: "Contexto Macro" },
  { key: "technical", icon: BarChart3, label: "Analise Tecnica" },
  { key: "fundamental", icon: Target, label: "Analise Fundamental" },
  { key: "sentiment", icon: Newspaper, label: "Sentimento" },
  { key: "risk", icon: Shield, label: "Gestao de Risco" },
] as const;

function BiasTag({
  bias,
  confidence,
}: {
  bias: string;
  confidence?: string;
}) {
  const biasConfig = {
    bullish: {
      text: "Bullish",
      color:
        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    },
    bearish: {
      text: "Bearish",
      color:
        "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
    },
    neutral: {
      text: "Neutro",
      color: "bg-gray-500/10 text-gray-500 border-gray-500/30",
    },
  };
  const b =
    biasConfig[bias as keyof typeof biasConfig] || biasConfig.neutral;

  return (
    <div className="flex items-center gap-2">
      <span
        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${b.color}`}
      >
        {b.text}
      </span>
      {confidence && (
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Confianca {confidence}
        </span>
      )}
    </div>
  );
}

export default function AnalystPage() {
  const [ticker, setTicker] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [error, setError] = useState("");

  async function handleAnalyze() {
    if (!ticker.trim() || loading) return;

    setLoading(true);
    setStatus("Iniciando analise...");
    setReport(null);
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError("Faca login para usar o analista.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/analyst/run", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ticker: ticker.trim().toUpperCase() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erro ao iniciar analise");
        setLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") continue;

          try {
            const event = JSON.parse(payload);
            if (event.type === "status") {
              setStatus(event.data);
            } else if (event.type === "report") {
              const reportData = JSON.parse(event.data);
              setReport(reportData);
              setStatus("");
            } else if (event.type === "error") {
              setError(event.data);
            }
          } catch {
            // ignore parse errors in SSE stream
          }
        }
      }
    } catch (err) {
      setError("Erro de conexao. Tente novamente.");
      console.error("[analyst]", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <PaywallGate requiredPlan="ultra" blurContent>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">
            Analista de Ativos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Analise completa com IA -- tecnica, fundamental, sentimento, risco
            e veredicto
          </p>
        </div>

        {/* Search */}
        <div className="flex gap-3 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              placeholder="Digite o ticker (EURUSD, AAPL, BTC, XAUUSD...)"
              className="w-full rounded-xl border border-border/60 bg-transparent pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={loading}
            />
          </div>
          <button
            onClick={handleAnalyze}
            disabled={loading || !ticker.trim()}
            className="rounded-full bg-foreground text-background px-6 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <BarChart3 className="h-4 w-4" />
            )}
            {loading ? "Analisando..." : "Analisar"}
          </button>
        </div>

        {/* Status */}
        {status && (
          <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {status}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-500">
            {error}
          </div>
        )}

        {/* Report */}
        {report && (
          <div className="space-y-6">
            {/* Verdict Card */}
            <div
              className="rounded-[22px] border border-border/40 p-6 isolate"
              style={{ backgroundColor: "hsl(var(--card))" }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">
                    {report.ticker}
                  </h2>
                  <p className="text-xs text-muted-foreground capitalize">
                    {report.assetType} · Gerado{" "}
                    {new Date(report.generatedAt).toLocaleString("pt-BR")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {report.verdict.bias === "bullish" ? (
                    <TrendingUp className="h-6 w-6 text-emerald-500" />
                  ) : report.verdict.bias === "bearish" ? (
                    <TrendingDown className="h-6 w-6 text-red-500" />
                  ) : (
                    <Minus className="h-6 w-6 text-gray-400" />
                  )}
                  <BiasTag
                    bias={report.verdict.bias}
                    confidence={report.verdict.confidence}
                  />
                </div>
              </div>

              <p className="text-sm leading-relaxed mb-4">
                {report.verdict.summary}
              </p>

              {/* Key Levels */}
              {report.verdict.keyLevels.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {report.verdict.keyLevels.map((level, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-muted px-3 py-1 text-xs font-mono"
                    >
                      {level}
                    </span>
                  ))}
                </div>
              )}

              {/* Trade Idea */}
              {report.verdict.tradeIdea && (
                <div className="rounded-xl bg-muted/50 p-4 text-sm">
                  <span className="font-semibold text-xs uppercase tracking-wider text-muted-foreground block mb-1">
                    Ideia de Trade
                  </span>
                  {report.verdict.tradeIdea}
                </div>
              )}
            </div>

            {/* Analysis Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {SECTION_CONFIG.map(({ key, icon: Icon, label }) => {
                const section =
                  report.sections[key as keyof typeof report.sections];
                if (!section) return null;

                return (
                  <div
                    key={key}
                    className="rounded-[22px] border border-border/40 p-5 isolate"
                    style={{ backgroundColor: "hsl(var(--card))" }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <h3 className="text-sm font-semibold tracking-tight">
                          {label}
                        </h3>
                      </div>
                      {section.bias && (
                        <BiasTag
                          bias={section.bias}
                          confidence={section.confidence}
                        />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                      {section.content}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!report && !loading && !error && (
          <div className="text-center py-20">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              Nenhuma analise ainda
            </h3>
            <p className="text-sm text-muted-foreground/70">
              Digite um ticker acima para gerar uma analise completa com IA
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {["EURUSD", "XAUUSD", "BTC", "AAPL", "DXY"].map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTicker(t);
                  }}
                  className="rounded-full bg-muted px-3 py-1 text-xs font-medium hover:bg-muted/80 transition-colors"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </PaywallGate>
  );
}
