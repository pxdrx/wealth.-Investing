"use client";

import { useState, useCallback, useRef, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { BarChart3, Calendar, MessageCircle, Brain, Users, Newspaper, Sparkles, TrendingUp, Clock, Shield, FileText, Lightbulb, Loader2, Plus } from "lucide-react";
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

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

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
    description: "Análise seus trades mais recentes",
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

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Bom dia! Como posso ajudar?";
  if (hour >= 12 && hour < 18) return "Boa tarde! Como posso ajudar?";
  if (hour >= 18 && hour < 24) return "Boa noite! Como posso ajudar?";
  return "Como posso te ajudar nessa madrugada?";
}

// Max messages to load from history
const MAX_HISTORY = 50;

function AICoachPageInner() {
  const { activeAccountId } = useActiveAccount();
  const { plan, isUltra: isUltraTier } = useSubscription();
  const limits = getTierLimits(plan);
  const searchParams = useSearchParams();
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [usageCount, setUsageCount] = useState(0);
  const [usageLoaded, setUsageLoaded] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [analysisType, setAnalysisType] = useState<"session" | "weekly" | "chat">("chat");
  const [dataMode, setDataMode] = useState(false);
  const [trades, setTrades] = useState<JournalTradeRow[]>([]);
  const [tradesLoaded, setTradesLoaded] = useState(false);

  // Conversation management
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeConversationTitle, setActiveConversationTitle] = useState("Nova conversa");
  const [conversationsLoaded, setConversationsLoaded] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const titleUpdatedRef = useRef(false);
  const skipNextHistoryLoadRef = useRef(false);

  const quotaExhausted = usageCount >= limits.aiCoachMonthly;
  const usagePct = limits.aiCoachMonthly > 0
    ? Math.min(100, (usageCount / limits.aiCoachMonthly) * 100)
    : 0;

  const hasMessages = messages.length > 0;

  // Helper to get auth token
  const getToken = useCallback(async () => {
    try {
      const result = await Promise.race([
        supabase.auth.getSession(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("getToken timeout")), 5_000)),
      ]);
      return result.data.session?.access_token ?? null;
    } catch {
      console.warn("[ai-coach] getToken timed out");
      return null;
    }
  }, []);

  // Load conversations list and initialize active conversation
  useEffect(() => {
    async function initConversations() {
      try {
        const token = await getToken();
        if (!token) { return; }

        const res = await fetch("/api/ai/conversations", {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(12_000),
        });
        const json = await res.json();
        if (json.ok && json.data) {
          setConversations(json.data);
        }

        // Check URL param for active conversation
        const chatId = searchParams.get("chat");
        if (chatId) {
          setActiveConversationId(chatId);
          const found = (json.data as Conversation[])?.find((c: Conversation) => c.id === chatId);
          if (found) setActiveConversationTitle(found.title);
        } else if (json.data && json.data.length > 0) {
          // Use most recent conversation
          const latest = json.data[0];
          setActiveConversationId(latest.id);
          setActiveConversationTitle(latest.title);
          window.history.replaceState(null, "", `/app/ai-coach?chat=${latest.id}`);
        } else {
          // No conversations exist — create one
          const createRes = await fetch("/api/ai/conversations", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ title: "Nova conversa" }),
            signal: AbortSignal.timeout(12_000),
          });
          const createJson = await createRes.json();
          if (createJson.ok && createJson.data) {
            setActiveConversationId(createJson.data.id);
            setActiveConversationTitle(createJson.data.title);
            setConversations([{ ...createJson.data, updated_at: createJson.data.created_at }]);
            window.history.replaceState(null, "", `/app/ai-coach?chat=${createJson.data.id}`);
          }
        }
      } catch (err) {
        console.error("[ai-coach] initConversations failed:", err);
      } finally {
        setConversationsLoaded(true);
      }
    }
    initConversations();
    // Run once on mount — loads or creates the initial conversation list.
    // supabase and searchParams at mount time are the only inputs needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React to URL searchParams changes (e.g., sidebar conversation clicks, browser back/forward)
  useEffect(() => {
    if (!conversationsLoaded) return;
    const chatId = searchParams.get("chat");
    if (chatId && chatId !== activeConversationId) {
      setActiveConversationId(chatId);
      const found = conversations.find((c) => c.id === chatId);
      if (found) setActiveConversationTitle(found.title);
    }
    // Only re-run when searchParams changes (URL navigation). Including
    // activeConversationId or conversations would cause infinite loops
    // since this effect mutates them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Load current usage
  useEffect(() => {
    async function loadUsage() {
      try {
        const { data: { session } } = await Promise.race([
          supabase.auth.getSession(),
          new Promise<{ data: { session: null } }>((resolve) =>
            setTimeout(() => resolve({ data: { session: null } }), 4_000),
          ),
        ]);
        if (!session?.user?.id) return;
        const currentMonth = new Date().toISOString().slice(0, 7);
        const { data } = await supabase
          .from("ai_usage")
          .select("usage_count")
          .eq("user_id", session.user.id)
          .eq("month", currentMonth)
          .maybeSingle();
        setUsageCount((data as { usage_count?: number } | null)?.usage_count ?? 0);
      } catch (err) {
        console.error("[ai-coach] loadUsage failed:", err);
      } finally {
        setUsageLoaded(true);
      }
    }
    loadUsage();
    // Run once on mount — usage count is loaded once and updated after
    // each AI message send, not via re-running this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load chat history for active conversation
  useEffect(() => {
    // Skip loading for brand-new conversations (already cleared by handleNewChat)
    if (skipNextHistoryLoadRef.current) {
      skipNextHistoryLoadRef.current = false;
      setHistoryLoaded(true);
      return;
    }
    async function loadHistory() {
      if (!activeConversationId) {
        setHistoryLoaded(true);
        return;
      }
      try {
        const { data: { session } } = await Promise.race([
          supabase.auth.getSession(),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5_000)),
        ]);
        if (!session?.user?.id) {
          setHistoryLoaded(true);
          return;
        }

        const { data, error } = await supabase
          .from("ai_coach_messages")
          .select("id, role, content, created_at")
          .eq("user_id", session.user.id)
          .eq("conversation_id", activeConversationId)
          .order("created_at", { ascending: true })
          .limit(MAX_HISTORY);

        if (!error && data && data.length > 0) {
          setMessages(
            (data as { id: string; role: string; content: string }[]).map((row) => ({
              id: row.id,
              role: row.role as "user" | "assistant",
              content: row.content,
            }))
          );
        } else {
          setMessages([]);
        }
        titleUpdatedRef.current = false;
      } catch (err) {
        console.warn("[ai-coach] loadHistory failed:", err);
        setMessages([]);
      } finally {
        setHistoryLoaded(true);
      }
    }
    setHistoryLoaded(false);
    loadHistory();
  }, [activeConversationId]);

  // Safety timeout: force loaded flags after 10s to prevent infinite spinner
  useEffect(() => {
    const timeout = setTimeout(() => {
      setConversationsLoaded(true);
      setHistoryLoaded(true);
      setUsageLoaded(true);
      if (typeof window !== "undefined") {
        console.warn("[AI Coach] Safety timeout: forced loaded flags after 10s");
      }
    }, 10_000);
    return () => clearTimeout(timeout);
  }, []);

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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;
      const { data } = await supabase
        .from("journal_trades")
        .select("id, symbol, direction, opened_at, closed_at, pnl_usd, fees_usd, net_pnl_usd, category, emotion, discipline, setup_quality, custom_tags, entry_rating, exit_rating, management_rating, mfe_usd, mae_usd")
        .eq("user_id", session.user.id)
        .eq("account_id", activeAccountId)
        .order("closed_at", { ascending: true })
        .limit(500);
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
      .insert({
        user_id: session.user.id,
        role,
        content,
        conversation_id: activeConversationId,
      })
      .select("id")
      .maybeSingle();
    if (error) {
      console.warn("[ai-coach] save message error:", error.message);
      return undefined;
    }
    return (data as { id: string } | null)?.id ?? undefined;
  }, [activeConversationId]);

  // Start a new conversation
  const handleNewChat = useCallback(async () => {
    if (isStreaming) return;
    const token = await getToken();
    if (!token) return;

    const res = await fetch("/api/ai/conversations", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Nova conversa" }),
    });
    const json = await res.json();
    if (json.ok && json.data) {
      const newConv: Conversation = { ...json.data, updated_at: json.data.created_at };
      setConversations((prev) => [newConv, ...prev]);
      setMessages([]);
      setHistoryLoaded(true);
      titleUpdatedRef.current = false;
      skipNextHistoryLoadRef.current = true;
      setActiveConversationId(json.data.id);
      setActiveConversationTitle(json.data.title);
      router.push(`/app/ai-coach?chat=${json.data.id}`);
      chatContainerRef.current?.scrollTo(0, 0);
    }
  }, [isStreaming, getToken, router]);

  // Switch to an existing conversation
  const switchConversation = useCallback((conv: Conversation) => {
    if (isStreaming) return;
    setActiveConversationId(conv.id);
    setActiveConversationTitle(conv.title);
    router.push(`/app/ai-coach?chat=${conv.id}`);
  }, [isStreaming, router]);

  // Auto-title after first user message
  const autoUpdateTitle = useCallback(async (userMessage: string) => {
    if (!activeConversationId || titleUpdatedRef.current) return;
    titleUpdatedRef.current = true;

    const autoTitle = userMessage.slice(0, 50) + (userMessage.length > 50 ? "..." : "");
    const token = await getToken();
    if (!token) return;

    await fetch("/api/ai/conversations", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ id: activeConversationId, title: autoTitle }),
    });

    setActiveConversationTitle(autoTitle);
    setConversations((prev) =>
      prev.map((c) => (c.id === activeConversationId ? { ...c, title: autoTitle } : c))
    );
  }, [activeConversationId, getToken]);

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

    // Auto-title on first user message
    if (activeConversationTitle === "Nova conversa") {
      autoUpdateTitle(text);
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
  }, [activeAccountId, isStreaming, quotaExhausted, messages, analysisType, dataMode, tradeAnalytics, saveMessage, activeConversationTitle, autoUpdateTitle]);

  return (
    <main className="flex w-full h-[calc(100dvh-4rem)] lg:h-full p-3 sm:p-6 lg:p-8 gap-6 overflow-hidden overflow-x-hidden">
      {/* LEFT PANE: Context & Data Insights (Hidden on small screens) */}
      <div className="hidden lg:flex flex-col w-[350px] xl:w-[400px] shrink-0 gap-6 overflow-y-auto custom-scrollbar pr-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">
              AI Coach
            </h1>
            {isUltraTier && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/40 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50">
                <Sparkles className="h-3 w-3" />
                Ultra
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground font-medium">
            {isUltraTier
              ? "Analista avancado com contexto personalizado."
              : "Seu analista quantitativo pessoal."}
          </p>
        </div>

        <PaywallGate requiredPlan="pro" blurContent>
          <div className="flex flex-col gap-6">
            {/* Quick Actions Bento */}
            <div className="flex flex-col gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Ações Rápidas</h2>
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
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Contexto de Dados</h2>
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
                 <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Insights Profundos</h2>
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

            {/* Conversation History */}
            {conversationsLoaded && conversations.length > 0 && (
              <div className="flex flex-col gap-3">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Conversas</h2>
                <div className="flex flex-col gap-1.5 max-h-[240px] overflow-y-auto custom-scrollbar">
                  {conversations.map((conv) => (
                    <button
                      key={conv.id}
                      type="button"
                      disabled={isStreaming}
                      onClick={() => switchConversation(conv)}
                      className={cn(
                        "flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-left transition-all text-sm",
                        conv.id === activeConversationId
                          ? "bg-blue-500/10 border border-blue-500/30 text-foreground font-medium"
                          : "border border-transparent hover:bg-card/60 hover:border-border/40 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <MessageCircle className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{conv.title}</span>
                    </button>
                  ))}
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
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border/30 bg-background/20 backdrop-blur-md shrink-0 gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
             <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse shrink-0" />
             <span className="text-sm font-semibold tracking-wide text-foreground truncate max-w-[140px] sm:max-w-[200px]">
               {activeConversationTitle}
             </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <button
              onClick={handleNewChat}
              disabled={isStreaming}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" /> Novo chat
            </button>
            {usageLoaded && (
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-10 sm:w-16 rounded-full overflow-hidden bg-muted/50">
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
               <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6 custom-scrollbar">
                 {(!historyLoaded || !usageLoaded || !conversationsLoaded) && (
                   <div className="h-full flex items-center justify-center">
                     <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                   </div>
                 )}
                 {historyLoaded && usageLoaded && conversationsLoaded && !hasMessages && (
                   <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto px-4">
                     <div className="mb-6">
                       <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 mb-4">
                         <Brain className="h-8 w-8 text-blue-500" />
                       </div>
                       <p className="text-lg font-semibold text-foreground mb-1">{getGreeting()}</p>
                       <p className="text-sm text-muted-foreground">
                         {isUltraTier
                           ? "Sou seu AI Coach Ultra. Analiso seus trades com contexto personalizado e respostas mais profundas."
                           : "Sou seu AI Coach. Analiso seus trades, identifico padroes e ajudo a melhorar sua performance."}
                       </p>
                     </div>
                     <div className="flex flex-wrap justify-center gap-2">
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
               <div className="p-3 sm:p-4 bg-background/40 backdrop-blur-xl border-t border-border/30 shrink-0">
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

export default function AICoachPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full w-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    }>
      <AICoachPageInner />
    </Suspense>
  );
}
