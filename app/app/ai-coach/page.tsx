"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { BarChart3, Calendar, MessageCircle, Brain, Users, Newspaper, Sparkles, TrendingUp, Clock, Shield, FileText, Lightbulb } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useActiveAccount } from "@/components/context/ActiveAccountContext";
import { useSubscription } from "@/components/context/SubscriptionContext";
import { getTierLimits } from "@/lib/subscription-shared";
import { ChatMessage } from "@/components/ai/ChatMessage";
import { ChatInput } from "@/components/ai/ChatInput";
import { supabase } from "@/lib/supabase/client";
import { computeTradeAnalytics } from "@/lib/trade-analytics";
import { formatPsychologyProfile } from "@/lib/ai-prompts";
import { PaywallGate } from "@/components/billing/PaywallGate";
import type { JournalTradeRow } from "@/components/journal/types";
import { cn } from "@/lib/utils";

interface Message {
  id?: string;
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

// Max messages to load from history
const MAX_HISTORY = 50;

export default function AICoachPage() {
  const { activeAccountId } = useActiveAccount();
  const { plan } = useSubscription();
  const limits = getTierLimits(plan);

  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [usageCount, setUsageCount] = useState(0);
  const [usageLoaded, setUsageLoaded] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [analysisType, setAnalysisType] = useState<"session" | "weekly" | "chat">("chat");
  const [dataMode, setDataMode] = useState(false);
  const [trades, setTrades] = useState<JournalTradeRow[]>([]);
  const [tradesLoaded, setTradesLoaded] = useState(false);
  const [conversationStartedAt, setConversationStartedAt] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("ai-coach-conversation-started-at") ?? "";
    }
    return "";
  });
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const quotaExhausted = usageCount >= limits.aiCoachMonthly;
  const usagePct = limits.aiCoachMonthly > 0
    ? Math.min(100, (usageCount / limits.aiCoachMonthly) * 100)
    : 0;

  const hasMessages = messages.length > 0;
  const pathname = usePathname();

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
  }, [pathname]);

  // Load chat history from Supabase (only messages after conversationStartedAt)
  useEffect(() => {
    async function loadHistory() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        setHistoryLoaded(true);
        return;
      }
      let query = supabase
        .from("ai_coach_messages")
        .select("id, role, content, created_at")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: true })
        .limit(MAX_HISTORY);

      // Only load messages from current conversation
      if (conversationStartedAt) {
        query = query.gt("created_at", conversationStartedAt);
      }

      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        setMessages(
          (data as { id: string; role: string; content: string }[]).map((row) => ({
            id: row.id,
            role: row.role as "user" | "assistant",
            content: row.content,
          }))
        );
      }
      setHistoryLoaded(true);
    }
    loadHistory();
  }, [pathname, conversationStartedAt]);

  // Scroll to bottom when history loads or new messages arrive
  useEffect(() => {
    if (historyLoaded) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, historyLoaded]);

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

  // Save a message to Supabase
  const saveMessage = useCallback(async (role: "user" | "assistant", content: string): Promise<string | undefined> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return undefined;
    const { data, error } = await supabase
      .from("ai_coach_messages")
      .insert({ user_id: session.user.id, role, content })
      .select("id")
      .maybeSingle();
    if (error) {
      console.warn("[ai-coach] save message error:", error.message);
      return undefined;
    }
    return (data as { id: string } | null)?.id ?? undefined;
  }, []);

  // Start new conversation — keep old messages in DB, just filter them out
  const clearHistory = useCallback(() => {
    if (isStreaming) return;
    const now = new Date().toISOString();
    setConversationStartedAt(now);
    localStorage.setItem("ai-coach-conversation-started-at", now);
    setMessages([]);
    chatContainerRef.current?.scrollTo(0, 0);
  }, [isStreaming]);

  const sendMessage = useCallback(async (text: string, type?: "session" | "weekly" | "chat") => {
    if (!activeAccountId || isStreaming || quotaExhausted) return;

    const currentType = type ?? analysisType;
    const userMessage: Message = { role: "user", content: text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsStreaming(true);

    // Save user message to DB
    const userMsgId = await saveMessage("user", text);
    if (userMsgId) {
      setMessages((prev) => {
        const updated = [...prev];
        const lastUserIdx = updated.length - 1;
        if (updated[lastUserIdx]?.role === "user") {
          updated[lastUserIdx] = { ...updated[lastUserIdx], id: userMsgId };
        }
        return updated;
      });
    }

    // Optimistically add assistant placeholder
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    const controller = new AbortController();
    abortRef.current = controller;

    let fullAssistantContent = "";

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
              const errorText = `\n\n_Erro: ${parsed.error}_`;
              fullAssistantContent += errorText;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: updated[updated.length - 1].content + errorText,
                };
                return updated;
              });
            } else if (parsed.text) {
              fullAssistantContent += parsed.text;
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

      // Save complete assistant message to DB
      if (fullAssistantContent) {
        const assistantMsgId = await saveMessage("assistant", fullAssistantContent);
        if (assistantMsgId) {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { ...updated[updated.length - 1], id: assistantMsgId };
            return updated;
          });
        }
      }

      setUsageCount((prev) => prev + 1);
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        // User cancelled — do nothing
      } else {
        const errMsg = (err as Error).message;
        // Map known API error codes to user-facing messages
        let displayError = "Erro ao conectar com o AI Coach. Tente novamente.";
        if (errMsg === "quota_exceeded") {
          displayError = "Limite mensal de analises atingido. Faca upgrade para continuar.";
        } else if (errMsg === "daily_quota_exceeded") {
          displayError = "Limite diario de analises atingido. Tente novamente amanha.";
        } else if (errMsg === "rate_limited") {
          displayError = "Muitas requisicoes. Aguarde um momento.";
        } else if (errMsg && errMsg !== "Request failed") {
          displayError = errMsg;
        }
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: displayError,
          };
          return updated;
        });
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [activeAccountId, isStreaming, quotaExhausted, messages, analysisType, dataMode, tradeAnalytics, saveMessage]);

  return (
    <main className="flex w-full h-full p-6 lg:p-8 gap-6 overflow-hidden">
      {/* LEFT PANE: Context & Data Insights (Hidden on small screens) */}
      <div className="hidden lg:flex flex-col w-[350px] xl:w-[400px] shrink-0 gap-6 overflow-y-auto custom-scrollbar pr-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">
            AI Co-Pilot
          </h1>
          <p className="mt-1 text-sm text-muted-foreground font-medium">
            Seu analista quantitativo pessoal.
          </p>
        </div>

        <PaywallGate requiredPlan="pro" blurContent>
          <div className="flex flex-col gap-6">
            {/* Quick Actions Bento */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Ações Rápidas</h3>
              <div className="grid grid-cols-1 gap-3">
                {QUICK_ACTIONS.map((action, i) => {
                  const Icon = action.icon;
                  return (
                    <motion.button
                      key={action.type}
                      type="button"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.08, ease: easeApple }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={quotaExhausted || isStreaming}
                      onClick={() => {
                        setAnalysisType(action.type);
                        if (action.prompt) {
                          sendMessage(action.prompt, action.type);
                        }
                      }}
                      className="group flex items-center gap-4 rounded-[16px] border border-border/40 bg-card/60 p-4 text-left transition-all hover:border-blue-500/30 hover:shadow-[0_0_20px_rgba(32,107,179,0.1)] backdrop-blur-xl disabled:opacity-50"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                        <Icon className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground group-hover:text-blue-400 transition-colors">{action.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Context Data Source */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Contexto de Dados</h3>
                {!dataMode ? (
                  <button
                    onClick={() => setDataMode(true)}
                    className="text-[10px] font-bold uppercase tracking-wider text-blue-500 hover:text-blue-400 transition-colors"
                  >
                    Ativar Analytics
                  </button>
                ) : (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                    Sincronizado
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2 rounded-[16px] border border-border/40 bg-card/40 p-4 backdrop-blur-xl">
                {DATA_SOURCES.map((src, i) => (
                  <div key={src.label} className="flex items-center gap-3 py-1">
                    <src.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground font-medium">{src.label}</span>
                    <div className="ml-auto h-2 w-2 rounded-full bg-emerald-500/50" />
                  </div>
                ))}
                {dataMode && tradesLoaded && (
                  <div className="mt-2 pt-3 border-t border-border/30 flex items-center gap-3">
                    <Sparkles className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium text-blue-400">{trades.length} trades em memória</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Deep Insights */}
            {dataMode && tradesLoaded && (
               <div className="flex flex-col gap-3">
                 <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Insights Profundos</h3>
                 <div className="flex flex-wrap gap-2">
                   {INSIGHT_BUTTONS.map((btn, i) => {
                     const Icon = btn.icon;
                     return (
                       <button
                         key={i}
                         type="button"
                         disabled={quotaExhausted || isStreaming}
                         onClick={() => {
                           setAnalysisType("chat");
                           sendMessage(btn.prompt, "chat");
                         }}
                         className="flex items-center gap-1.5 rounded-full border border-border/40 bg-card/40 px-3 py-1.5 text-xs font-medium text-foreground hover:border-blue-400 hover:bg-blue-500/10 transition-all backdrop-blur-xl"
                       >
                         <Icon className="h-3.5 w-3.5 text-blue-500" />
                         {btn.label}
                       </button>
                     );
                   })}
                 </div>
               </div>
            )}
            
          </div>
        </PaywallGate>
      </div>

      {/* RIGHT PANE: Chat Interface */}
      <div className="flex-1 flex flex-col h-full rounded-[24px] border border-border/50 bg-card/60 shadow-soft dark:shadow-soft-dark overflow-hidden backdrop-blur-3xl relative isolate">
        {/* Glow behind chat */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] -z-10 pointer-events-none" />
        
        {/* Chat Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/30 bg-background/20 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
             <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
             <span className="text-sm font-semibold tracking-wide text-foreground">Sessão Ativa</span>
          </div>

          <div className="flex items-center gap-4">
            {hasMessages && !isStreaming && (
              <button
                onClick={clearHistory}
                className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Limpar Memória
              </button>
            )}
            {usageLoaded && (
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-16 rounded-full overflow-hidden bg-muted/50">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${usagePct >= 90 ? "bg-red-500" : usagePct >= 70 ? "bg-amber-500" : "bg-emerald-500"}`}
                    style={{ width: `${usagePct}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold text-muted-foreground">
                  {usageCount}/{limits.aiCoachMonthly}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 flex flex-col min-h-0 relative">
          {!activeAccountId && (
            <div className="flex-1 flex items-center justify-center p-8">
              <p className="text-sm text-muted-foreground">
                Selecione uma conta no menu principal para iniciar.
              </p>
            </div>
          )}

          {activeAccountId && (
             <>
               <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
                 {!hasMessages && historyLoaded && (
                   <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto opacity-60">
                     <Brain className="h-12 w-12 text-blue-500/50 mb-4" />
                     <p className="text-sm text-foreground font-medium mb-1">Coach Prontidão</p>
                     <p className="text-xs text-muted-foreground">Use os atalhos laterais ou digite uma mensagem abaixo para iniciar a análise quantitativa.</p>
                   </div>
                 )}
                 
                 {hasMessages && (
                   <div className="space-y-6 pb-4">
                     {messages.map((msg, i) => {
                       const isAssistant = msg.role === "assistant";
                         return (
                          <ChatMessage
                           key={msg.id ?? `msg-${i}`}
                           role={msg.role}
                           content={msg.content}
                           isStreaming={isStreaming && i === messages.length - 1 && isAssistant}
                         />
                        );
                      })}
                     <div ref={messagesEndRef} />
                   </div>
                 )}
                 
                 {quotaExhausted && (
                   <div className="mt-8 p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-center">
                     <p className="text-sm text-red-500 font-medium mb-2">Limite Mensal Atingido</p>
                     <a href="/app/pricing" className="text-xs font-bold text-red-400 hover:text-red-300 underline">Fazer Upgrade do Plano</a>
                   </div>
                 )}
               </div>

               {/* Input Area */}
               <div className="p-4 bg-background/40 backdrop-blur-xl border-t border-border/30 shrink-0">
                 <ChatInput
                   onSubmit={(text) => sendMessage(text)}
                   disabled={quotaExhausted || isStreaming}
                   placeholder={quotaExhausted ? "Limite bloqueado" : "Comande a análise..."}
                 />
               </div>
             </>
          )}
        </div>
      </div>
    </main>
  );
}
