"use client";

import { useState, useEffect, useCallback } from "react";
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
  ArrowLeft,
  Clock,
  Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { CpuArchitecture } from "@/components/ui/cpu-architecture";
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

// Name → Ticker mapping for autocomplete
const ASSET_MAP: Array<{ name: string; ticker: string; type: string }> = [
  // Forex
  { name: "Euro Dólar", ticker: "EURUSD", type: "forex" },
  { name: "Libra Dólar", ticker: "GBPUSD", type: "forex" },
  { name: "Dólar Iene", ticker: "USDJPY", type: "forex" },
  { name: "Dólar Franco", ticker: "USDCHF", type: "forex" },
  { name: "Aussie Dólar", ticker: "AUDUSD", type: "forex" },
  { name: "Dólar Canadense", ticker: "USDCAD", type: "forex" },
  { name: "Kiwi Dólar", ticker: "NZDUSD", type: "forex" },
  { name: "Euro Libra", ticker: "EURGBP", type: "forex" },
  { name: "Euro Iene", ticker: "EURJPY", type: "forex" },
  { name: "Libra Iene", ticker: "GBPJPY", type: "forex" },
  { name: "Dólar Real", ticker: "USDBRL", type: "forex" },
  // Crypto
  { name: "Bitcoin", ticker: "BTC", type: "crypto" },
  { name: "Ethereum", ticker: "ETH", type: "crypto" },
  { name: "Solana", ticker: "SOL", type: "crypto" },
  { name: "Ripple", ticker: "XRP", type: "crypto" },
  { name: "Cardano", ticker: "ADA", type: "crypto" },
  { name: "Dogecoin", ticker: "DOGE", type: "crypto" },
  { name: "Polkadot", ticker: "DOT", type: "crypto" },
  { name: "Avalanche", ticker: "AVAX", type: "crypto" },
  { name: "Chainlink", ticker: "LINK", type: "crypto" },
  { name: "Litecoin", ticker: "LTC", type: "crypto" },
  // Commodities
  { name: "Ouro", ticker: "XAUUSD", type: "commodity" },
  { name: "Gold", ticker: "XAUUSD", type: "commodity" },
  { name: "Prata", ticker: "XAGUSD", type: "commodity" },
  { name: "Silver", ticker: "XAGUSD", type: "commodity" },
  { name: "Petróleo WTI", ticker: "WTIUSD", type: "commodity" },
  { name: "Petróleo Brent", ticker: "BRENT", type: "commodity" },
  { name: "Oil", ticker: "WTIUSD", type: "commodity" },
  { name: "Gás Natural", ticker: "NATGAS", type: "commodity" },
  // Indices
  { name: "S&P 500", ticker: "SPX", type: "index" },
  { name: "Nasdaq", ticker: "NDX", type: "index" },
  { name: "Dow Jones", ticker: "DJI", type: "index" },
  { name: "Índice Dólar", ticker: "DXY", type: "index" },
  { name: "Dollar Index", ticker: "DXY", type: "index" },
  { name: "Ibovespa", ticker: "IBOV", type: "index" },
  { name: "DAX", ticker: "DAX", type: "index" },
  { name: "VIX", ticker: "VIX", type: "index" },
  // Stocks (populares)
  { name: "Apple", ticker: "AAPL", type: "stock" },
  { name: "Microsoft", ticker: "MSFT", type: "stock" },
  { name: "Google", ticker: "GOOGL", type: "stock" },
  { name: "Amazon", ticker: "AMZN", type: "stock" },
  { name: "Tesla", ticker: "TSLA", type: "stock" },
  { name: "Nvidia", ticker: "NVDA", type: "stock" },
  { name: "Meta", ticker: "META", type: "stock" },
  { name: "Netflix", ticker: "NFLX", type: "stock" },
  { name: "Petrobras", ticker: "PBR", type: "stock" },
  { name: "Vale", ticker: "VALE", type: "stock" },
  { name: "Itaú", ticker: "ITUB", type: "stock" },
  { name: "Magazine Luiza", ticker: "MELI", type: "stock" },
  { name: "Coinbase", ticker: "COIN", type: "stock" },
];

function resolveTicker(input: string): string {
  const clean = input.trim();
  // Direct ticker match
  const directMatch = ASSET_MAP.find(
    (a) => a.ticker.toLowerCase() === clean.toLowerCase()
  );
  if (directMatch) return directMatch.ticker;
  // Name match
  const nameMatch = ASSET_MAP.find(
    (a) => a.name.toLowerCase() === clean.toLowerCase()
  );
  if (nameMatch) return nameMatch.ticker;
  // Partial name match
  const partialMatch = ASSET_MAP.find(
    (a) => a.name.toLowerCase().includes(clean.toLowerCase())
  );
  if (partialMatch) return partialMatch.ticker;
  // Return as-is (might be a valid ticker we don't have mapped)
  return clean.toUpperCase();
}

function getSuggestions(input: string): Array<{ name: string; ticker: string; type: string }> {
  if (!input || input.length < 2) return [];
  const q = input.toLowerCase();
  return ASSET_MAP.filter(
    (a) =>
      a.name.toLowerCase().includes(q) ||
      a.ticker.toLowerCase().includes(q)
  ).slice(0, 6);
}

export default function AnalystPage() {
  const [ticker, setTicker] = useState("");
  const [suggestions, setSuggestions] = useState<Array<{ name: string; ticker: string; type: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<
    Array<{
      id: string;
      ticker: string;
      asset_type: string;
      created_at: string;
      report: AnalysisReport;
    }>
  >([]);

  const loadHistory = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch("/api/analyst/history", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (data.ok && data.data) setHistory(data.data);
    } catch {
      // Silent — history is non-critical
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  async function handleDeleteReport(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Excluir esta análise?")) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      await fetch(`/api/analyst/history?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      setHistory((prev) => prev.filter((h) => h.id !== id));
    } catch {
      alert("Erro ao excluir análise.");
    }
  }

  function handleInputChange(value: string) {
    setTicker(value);
    const s = getSuggestions(value);
    setSuggestions(s);
    setShowSuggestions(s.length > 0);
  }

  function selectSuggestion(item: { name: string; ticker: string }) {
    setTicker(item.ticker);
    setShowSuggestions(false);
  }

  async function handleAnalyze() {
    if (!ticker.trim() || loading) return;
    setShowSuggestions(false);

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
        body: JSON.stringify({ ticker: resolveTicker(ticker) }),
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
              loadHistory();
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
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-10">
        {/* Background CPU Architecture — static, always visible, esmaecido */}
        {!loading && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-0 opacity-[0.03] overflow-hidden">
            <CpuArchitecture width="700" height="350" text="DXT" animateLines={false} animateMarkers={false} animateText={false} />
          </div>
        )}
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">
            Analista Dexter
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Seu analista financeiro com IA — digite um ativo e receba a análise completa
          </p>
        </div>

        {/* Search */}
        <div className="flex gap-3 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={ticker}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { setShowSuggestions(false); handleAnalyze(); }
                if (e.key === "Escape") setShowSuggestions(false);
              }}
              onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Bitcoin, Ouro, EURUSD, Apple, S&P 500..."
              className="w-full rounded-xl border border-border/60 bg-transparent pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={loading}
            />
            {/* Autocomplete dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div
                className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-border/60 shadow-lg overflow-hidden z-50"
                style={{ backgroundColor: "hsl(var(--card))" }}
              >
                {suggestions.map((item) => (
                  <button
                    key={item.ticker + item.name}
                    onMouseDown={() => selectSuggestion(item)}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors text-left"
                  >
                    <div>
                      <span className="font-medium">{item.ticker}</span>
                      <span className="text-muted-foreground ml-2">{item.name}</span>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">{item.type}</span>
                  </button>
                ))}
              </div>
            )}
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

        {/* Loading with CPU animation */}
        {loading && (
          <div className="mb-8 flex flex-col items-center gap-4">
            <CpuArchitecture width="320" height="160" text="DXT" className="opacity-60" />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {status || "Processando..."}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-500">
            {error}
          </div>
        )}

        {/* Back button */}
        {report && (
          <button
            onClick={() => setReport(null)}
            className="mb-4 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar as analises
          </button>
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

        {/* History */}
        {history.length > 0 && !report && !loading && (
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Analises recentes
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="relative group rounded-xl border border-border/40 p-3 text-left hover:bg-muted/50 transition-colors cursor-pointer"
                  style={{ backgroundColor: "hsl(var(--card))" }}
                  onClick={() => setReport(item.report)}
                >
                  <button
                    onClick={(e) => handleDeleteReport(item.id, e)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 rounded-full p-1 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all"
                    title="Excluir análise"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                  <div className="font-semibold text-sm">{item.ticker}</div>
                  <div className="text-[10px] text-muted-foreground capitalize">
                    {item.asset_type}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {new Date(item.created_at).toLocaleDateString("pt-BR")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!report && !loading && !error && history.length === 0 && (
          <div className="text-center py-12">
            <div className="mx-auto max-w-xs mb-6 opacity-30">
              <CpuArchitecture width="100%" height="160" text="DXT" animateLines={false} animateMarkers={false} animateText={false} />
            </div>
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              Nenhuma análise ainda
            </h3>
            <p className="text-sm text-muted-foreground/70">
              Digite um ticker acima para gerar uma análise completa com IA
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
