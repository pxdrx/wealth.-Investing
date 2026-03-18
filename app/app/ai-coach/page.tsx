"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { BarChart3, Calendar, MessageCircle, Brain, Users, Newspaper, Sparkles, TrendingUp, Clock, Shield, FileText, Lightbulb } from "lucide-react";
import { motion } from "framer-motion";
import { useActiveAccount } from "@/components/context/ActiveAccountContext";
import { useSubscription } from "@/components/context/SubscriptionContext";
import { getTierLimits } from "@/lib/subscription-shared";
import { ChatMessage } from "@/components/ai/ChatMessage";
import { ChatInput } from "@/components/ai/ChatInput";
import { supabase } from "@/lib/supabase/client";
import { computeTradeAnalytics } from "@/lib/trade-analytics";
import { formatPsychologyProfile } from "@/lib/ai-prompts";
import type { JournalTradeRow } from "@/components/journal/types";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const easeApple: [number, number, number, number] = [0.16, 1, 0.3, 1];

const QUICK_ACTIONS = [
  {
    type: "session" as const,
    icon: BarChart3,
    title: "Análise da sessão",
    description: "Analise seus trades mais recentes",
    prompt: "Faça uma análise da minha sessão de trading mais recente. Quais padrões você identifica e o que posso melhorar?",
  },
  {
    type: "weekly" as const,
    icon: Calendar,
    title: "Análise semanal",
    description: "Resumo e insights da sua semana",
    prompt: "Faça uma análise completa da minha semana de trading. Compare com semanas anteriores e me dê recomendações para a próxima.",
  },
  {
    type: "chat" as const,
    icon: MessageCircle,
    title: "Pergunta livre",
    description: "Pergunte qualquer coisa sobre seus trades",
    prompt: "",
  },
];

const DATA_SOURCES = [
  { icon: BarChart3, label: "Seus trades" },
  { icon: Users, label: "Comunidade" },
  { icon: Newspaper, label: "Notícias" },
];

const INSIGHT_BUTTONS = [
  { icon: TrendingUp, label: "Qual meu melhor par?", prompt: "Qual e meu melhor par de trading? Analise win rate, P&L total e consistencia por simbolo." },
  { icon: Clock, label: "Qual meu pior horario?", prompt: "Qual e meu pior horario de trading? Analise performance por hora e sessao. Devo evitar algum horario?" },
  { icon: Shield, label: "Como esta minha disciplina?", prompt: "Como esta minha disciplina de trading? Analise meu perfil psicologico, emocoes e impacto no resultado." },
  { icon: FileText, label: "Resumo da semana", prompt: "Faca um resumo completo da minha semana de trading com base nos dados disponiveis. Destaque pontos fortes e fracos." },
  { icon: Lightbulb, label: "O que posso melhorar?", prompt: "Com base em todos os meus dados, quais sao as 3 principais coisas que posso melhorar no meu trading?" },
];

export default function AICoachPage() {
  const { activeAccountId } = useActiveAccount();
  const { plan } = useSubscription();
  const limits = getTierLimits(plan);

  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [usageCount, setUsageCount] = useState(0);
  const [usageLoaded, setUsageLoaded] = useState(false);
  const [analysisType, setAnalysisType] = useState<"session" | "weekly" | "chat">("chat");
  const [dataMode, setDataMode] = useState(false);
  const [trades, setTrades] = useState<JournalTradeRow[]>([]);
  const [tradesLoaded, setTradesLoaded] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quotaExhausted = usageCount >= limits.aiCoachMonthly;
  const usagePct = limits.aiCoachMonthly > 0
    ? Math.min(100, (usageCount / limits.aiCoachMonthly) * 100)
    : 0;

  // Load current usage
  useEffect(() => {
    async function loadUsage() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;
      const currentMonth = new Date().toISOString().slice(0, 7);
      const { data } = await supabase
        .from("ai_usage")
        .select("usage_count")
        .eq("user_id", session.user.id)
        .eq("month", currentMonth)
        .maybeSingle();
      setUsageCount((data as { usage_count?: number } | null)?.usage_count ?? 0);
      setUsageLoaded(true);
    }
    loadUsage();
  }, []);

  // Load trades when data mode is activated
  useEffect(() => {
    if (!dataMode || !activeAccountId || tradesLoaded) return;
    async function loadTrades() {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user?.id) return;
      const { data } = await supabase
        .from("journal_trades")
        .select("id, symbol, direction, opened_at, closed_at, pnl_usd, fees_usd, net_pnl_usd, category, emotion, discipline, setup_quality, custom_tags, entry_rating, exit_rating, management_rating, mfe_usd, mae_usd")
        .eq("user_id", session.session.user.id)
        .eq("account_id", activeAccountId)
        .order("closed_at", { ascending: true });
      if (data) setTrades(data as JournalTradeRow[]);
      setTradesLoaded(true);
    }
    loadTrades();
  }, [dataMode, activeAccountId, tradesLoaded]);

  const tradeAnalytics = useMemo(() => {
    if (trades.length === 0) return null;
    return computeTradeAnalytics(trades);
  }, [trades]);

  const psychologyProfile = useMemo(() => {
    if (trades.length === 0) return null;
    return formatPsychologyProfile(trades);
  }, [trades]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (text: string, type?: "session" | "weekly" | "chat") => {
    if (!activeAccountId || isStreaming || quotaExhausted) return;

    const currentType = type ?? analysisType;
    const userMessage: Message = { role: "user", content: text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsStreaming(true);

    // Optimistically add assistant placeholder
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("No session");

      const response = await fetch("/api/ai/coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          type: currentType,
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          account_id: activeAccountId,
          ...(dataMode && tradeAnalytics ? { enriched: true } : {}),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(errData.error ?? "Request failed");
      }

      // Read SSE stream
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;

          try {
            const parsed = JSON.parse(data) as { error?: string; text?: string };
            if (parsed.error) {
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: updated[updated.length - 1].content + `\n\n_Erro: ${parsed.error}_`,
                };
                return updated;
              });
            } else if (parsed.text) {
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: updated[updated.length - 1].content + parsed.text,
                };
                return updated;
              });
            }
          } catch {}
        }
      }

      setUsageCount((prev) => prev + 1);
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        // User cancelled — do nothing
      } else {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: "Erro ao conectar com o AI Coach. Tente novamente.",
          };
          return updated;
        });
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [activeAccountId, isStreaming, quotaExhausted, messages, analysisType]);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      {/* Main card container — matches landing page mockup */}
      <div
        className="rounded-[22px] border border-border/50 overflow-hidden"
        style={{ backgroundColor: "hsl(var(--card))" }}
      >
        {/* ── Header bar ── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10">
              <Brain className="h-4.5 w-4.5 text-blue-500" />
            </div>
            <div>
              <span className="text-sm font-semibold text-foreground">AI Coach</span>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                <span className="text-[10px] text-muted-foreground">Online</span>
              </div>
            </div>
          </div>

          {/* Usage indicator */}
          {usageLoaded && (
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-16 rounded-full overflow-hidden bg-muted/50">
                <motion.div
                  className={`h-full rounded-full ${usagePct >= 90 ? "bg-red-500" : usagePct >= 70 ? "bg-amber-500" : "bg-green-500"}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${usagePct}%` }}
                  transition={{ duration: 0.6, ease: easeApple }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {usageCount}/{limits.aiCoachMonthly}
              </span>
            </div>
          )}
        </div>

        {/* ── Data sources strip ── */}
        <div className="flex items-center gap-2 px-5 py-2.5 border-b border-border/30">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground shrink-0 font-medium">
            Fontes:
          </span>
          {DATA_SOURCES.map((src) => (
            <div
              key={src.label}
              className="flex items-center gap-1 shrink-0 rounded-md px-2 py-0.5 bg-muted/30"
            >
              <src.icon className="h-2.5 w-2.5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">{src.label}</span>
            </div>
          ))}
          {dataMode && (
            <div className="flex items-center gap-1 shrink-0 rounded-md px-2 py-0.5 bg-blue-500/10">
              <Sparkles className="h-2.5 w-2.5 text-blue-500" />
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">Analytics</span>
            </div>
          )}
        </div>

        {/* ── Content area ── */}
        <div className="flex flex-col min-h-[400px]">
          {/* No account selected */}
          {!activeAccountId && (
            <div className="flex-1 flex items-center justify-center p-8">
              <p className="text-sm text-muted-foreground">
                Selecione uma conta para usar o AI Coach.
              </p>
            </div>
          )}

          {activeAccountId && (
            <div className="flex flex-col flex-1">
              {/* Quick action cards — empty state */}
              {messages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: easeApple }}
                  className="flex-1 flex flex-col justify-center p-6"
                >
                  <p className="text-xs font-medium text-muted-foreground mb-3">Como posso ajudar?</p>
                  <div className="grid grid-cols-3 gap-3">
                    {QUICK_ACTIONS.map((action, i) => {
                      const Icon = action.icon;
                      return (
                        <motion.button
                          key={action.type}
                          type="button"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: i * 0.08, ease: easeApple }}
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          disabled={quotaExhausted || isStreaming}
                          onClick={() => {
                            setAnalysisType(action.type);
                            if (action.prompt) {
                              sendMessage(action.prompt, action.type);
                            }
                          }}
                          className="flex flex-col items-start gap-3 rounded-2xl border border-border/40 p-4 text-left transition-all hover:border-border/80 hover:shadow-soft disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ backgroundColor: "hsl(var(--background))" }}
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                            <Icon className="h-4 w-4 text-blue-500" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{action.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Analisar Meus Dados section */}
                  <div className="mt-6 border-t border-border/30 pt-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-blue-500" />
                        <p className="text-xs font-medium text-muted-foreground">Analisar Meus Dados</p>
                      </div>
                      {!dataMode && (
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setDataMode(true)}
                          className="rounded-full bg-blue-500/10 px-3 py-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-colors"
                        >
                          Ativar
                        </motion.button>
                      )}
                      {dataMode && (
                        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                          {tradesLoaded ? `${trades.length} trades carregados` : "Carregando..."}
                        </span>
                      )}
                    </div>

                    {dataMode && tradesLoaded && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, ease: easeApple }}
                        className="flex flex-wrap gap-2"
                      >
                        {INSIGHT_BUTTONS.map((btn, i) => {
                          const Icon = btn.icon;
                          return (
                            <motion.button
                              key={i}
                              type="button"
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.2, delay: i * 0.05, ease: easeApple }}
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.97 }}
                              disabled={quotaExhausted || isStreaming}
                              onClick={() => {
                                setAnalysisType("chat");
                                sendMessage(btn.prompt, "chat");
                              }}
                              className="flex items-center gap-1.5 rounded-full border border-border/40 px-3 py-1.5 text-[11px] font-medium text-foreground hover:border-blue-300 hover:bg-blue-500/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              style={{ backgroundColor: "hsl(var(--background))" }}
                            >
                              <Icon className="h-3 w-3 text-blue-500" />
                              {btn.label}
                            </motion.button>
                          );
                        })}
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Messages */}
              {messages.length > 0 && (
                <div className="flex-1 space-y-4 p-5 overflow-y-auto max-h-[55vh]">
                  {messages.map((msg, i) => (
                    <ChatMessage
                      key={i}
                      role={msg.role}
                      content={msg.content}
                      isStreaming={isStreaming && i === messages.length - 1 && msg.role === "assistant"}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}

              {/* Quota exhausted */}
              {quotaExhausted && (
                <div className="flex flex-col items-center gap-3 p-6 border-t border-border/30">
                  <p className="text-sm text-foreground text-center">
                    Você usou todas as {limits.aiCoachMonthly} análises do plano {plan}.
                  </p>
                  <a
                    href="/app/pricing"
                    className="rounded-full bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                  >
                    Fazer upgrade
                  </a>
                </div>
              )}

              {/* Chat input — inside card */}
              <div className="border-t border-border/30 p-4">
                <ChatInput
                  onSubmit={(text) => sendMessage(text)}
                  disabled={quotaExhausted || isStreaming}
                  placeholder={quotaExhausted ? "Limite mensal atingido" : "Pergunte ao AI Coach..."}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
