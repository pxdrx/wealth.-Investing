"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { BarChart3, Calendar, MessageCircle, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { useActiveAccount } from "@/components/context/ActiveAccountContext";
import { useSubscription } from "@/components/context/SubscriptionContext";
import { getTierLimits } from "@/lib/subscription-shared";
import { UsageBar } from "@/components/ai/UsageBar";
import { QuickActionCard } from "@/components/ai/QuickActionCard";
import { ChatMessage } from "@/components/ai/ChatMessage";
import { ChatInput } from "@/components/ai/ChatInput";
import { supabase } from "@/lib/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
}

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

export default function AICoachPage() {
  const { activeAccountId } = useActiveAccount();
  const { plan } = useSubscription();
  const limits = getTierLimits(plan);

  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [usageCount, setUsageCount] = useState(0);
  const [usageLoaded, setUsageLoaded] = useState(false);
  const [analysisType, setAnalysisType] = useState<"session" | "weekly" | "chat">("chat");
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quotaExhausted = usageCount >= limits.aiCoachMonthly;

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
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10">
            <Sparkles className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight-apple leading-tight-apple text-foreground">
              AI Coach
            </h1>
            <p className="text-sm text-muted-foreground">
              Análises personalizadas baseadas nos seus dados de trading
            </p>
          </div>
        </div>
      </div>

      {/* Usage bar */}
      {usageLoaded && (
        <div className="mb-6">
          <UsageBar used={usageCount} limit={limits.aiCoachMonthly} />
        </div>
      )}

      {/* No account selected */}
      {!activeAccountId && (
        <Card className="rounded-[22px]" style={{ backgroundColor: "hsl(var(--card))" }}>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Selecione uma conta para usar o AI Coach.
            </p>
          </CardContent>
        </Card>
      )}

      {activeAccountId && (
        <div className="flex flex-col gap-4">
          {/* Quick action cards */}
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <p className="text-sm font-medium text-muted-foreground mb-3">Como posso ajudar?</p>
              <div className="grid gap-3 sm:grid-cols-3 mb-8 items-stretch">
                {QUICK_ACTIONS.map((action, i) => (
                  <motion.div
                    key={action.type}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <QuickActionCard
                      icon={action.icon}
                      title={action.title}
                      description={action.description}
                      disabled={quotaExhausted || isStreaming || !activeAccountId}
                      onClick={() => {
                        setAnalysisType(action.type);
                        if (action.prompt) {
                          sendMessage(action.prompt, action.type);
                        }
                      }}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Messages */}
          {messages.length > 0 && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
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
            <Card className="rounded-[22px] border-amber-500/30" style={{ backgroundColor: "hsl(var(--card))" }}>
              <CardContent className="flex flex-col items-center gap-3 py-6">
                <p className="text-sm text-foreground text-center">
                  Você usou todas as {limits.aiCoachMonthly} análises do plano {plan}.
                  Faça upgrade para continuar usando o AI Coach.
                </p>
                <a
                  href="/app/pricing"
                  className="rounded-full bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  Fazer upgrade
                </a>
              </CardContent>
            </Card>
          )}

          {/* Chat input */}
          <ChatInput
            onSubmit={(text) => sendMessage(text)}
            disabled={quotaExhausted || isStreaming}
            placeholder={quotaExhausted ? "Limite mensal atingido" : "Pergunte ao AI Coach..."}
          />
        </div>
      )}
    </main>
  );
}
