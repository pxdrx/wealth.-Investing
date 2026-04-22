"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { ChatInput } from "@/components/ai/ChatInput";
import { ChatMessage } from "@/components/ai/ChatMessage";
import { PaywallGate } from "@/components/billing/PaywallGate";
import { safeGetSession } from "@/lib/supabase/safe-session";
import { CompanionBriefing } from "./components/CompanionBriefing";
import { ContextChips } from "./components/ContextChips";
import { SLASH_COMMANDS, SlashCommandMenu } from "./components/SlashCommandMenu";
import type { SlashCommand } from "./components/SlashCommandMenu";
import { useCompanionContext } from "./hooks/useCompanionContext";

export interface CompanionClientProps {
  plan: "pro" | "ultra" | "mentor";
  userId: string;
  accountId: string | null;
}

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
}

export function CompanionClient({ plan, userId, accountId }: CompanionClientProps) {
  const router = useRouter();
  const { briefing, loading: briefingLoading, shown: briefingShown, markShown } =
    useCompanionContext(userId, accountId);

  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [inputDraft, setInputDraft] = useState<string | undefined>(undefined);
  const [slashQuery, setSlashQuery] = useState<string | null>(null);
  const [slashOpen, setSlashOpen] = useState(false);
  const [paywall, setPaywall] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const hasMessages = messages.length > 0;

  // plan awareness kept for potential future UI (badges, quota); silence unused warning.
  void plan;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSlashChange = useCallback((q: string | null) => {
    setSlashQuery(q);
    setSlashOpen(q !== null);
  }, []);

  const seedMessage = useCallback((text: string) => {
    setInputDraft(text);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (streaming) return;
      const trimmed = text.trim();
      if (!trimmed) return;

      setErrorMsg(null);
      const userMsg: Message = { role: "user", content: trimmed };
      setMessages((prev) => [...prev, userMsg, { role: "assistant", content: "" }]);
      setStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;
      let assistantContent = "";

      try {
        const { data: { session } } = await safeGetSession();
        if (!session?.access_token) throw new Error("no_session");

        const response = await fetch("/api/ai/companion", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ message: trimmed, accountId }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errJson = (await response.json().catch(() => ({}))) as { error?: string };
          if (response.status === 402) {
            setPaywall(true);
            setMessages((prev) => prev.slice(0, -2));
            return;
          }
          let display = errJson.error ?? "unavailable";
          if (response.status === 429) {
            const remaining = response.headers.get("X-RateLimit-Remaining");
            display = `Muitas mensagens em sequência.${remaining ? ` Restam ${remaining} na janela atual.` : ""} Tente em alguns minutos.`;
          } else if (response.status === 401) {
            display = "Sua sessão expirou. Atualize a página.";
          }
          throw new Error(display);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("no_reader");

        const decoder = new TextDecoder();
        let buffer = "";
        let done = false;

        while (!done) {
          const { done: readerDone, value } = await reader.read();
          if (readerDone) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") {
              done = true;
              break;
            }
            try {
              const parsed = JSON.parse(data) as { text?: string; error?: string };
              if (parsed.error) {
                const errorText = `\n\n_Erro: ${parsed.error}_`;
                assistantContent += errorText;
                setMessages((prev) => {
                  const next = [...prev];
                  next[next.length - 1] = {
                    role: "assistant",
                    content: next[next.length - 1].content + errorText,
                  };
                  return next;
                });
              } else if (parsed.text) {
                assistantContent += parsed.text;
                setMessages((prev) => {
                  const next = [...prev];
                  next[next.length - 1] = {
                    role: "assistant",
                    content: next[next.length - 1].content + parsed.text,
                  };
                  return next;
                });
              }
            } catch {
              // ignore parse errors on partial frames
            }
          }
        }

        if (!assistantContent) {
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = {
              role: "assistant",
              content: "Ticker ficou sem palavras. Tenta de novo?",
            };
            return next;
          });
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          // user cancelled — leave as-is
        } else {
          const msg = (err as Error).message || "unavailable";
          setMessages((prev) => {
            const next = [...prev];
            if (next.length && next[next.length - 1].role === "assistant" && !next[next.length - 1].content) {
              next[next.length - 1] = { role: "assistant", content: msg };
            } else {
              next.push({ role: "assistant", content: msg });
            }
            return next;
          });
          setErrorMsg(msg);
        }
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [accountId, streaming],
  );

  const handleSlashSelect = useCallback(
    (cmd: SlashCommand, arg?: string) => {
      setSlashOpen(false);
      setSlashQuery(null);
      setInputDraft("");
      switch (cmd.id) {
        case "coach":
          router.push("/app/dexter/coach");
          break;
        case "analyst": {
          const ticker = (arg ?? "").trim().toUpperCase();
          router.push(ticker ? `/app/dexter/analyst?ticker=${encodeURIComponent(ticker)}` : "/app/dexter/analyst");
          break;
        }
        case "trade":
          router.push("/app/journal?addTrade=1");
          break;
        case "mood":
          setInputDraft("Como está meu mood hoje?");
          break;
        case "reset":
          setMessages([]);
          setErrorMsg(null);
          break;
      }
    },
    [router],
  );

  const handleSubmit = useCallback(
    (text: string) => {
      setInputDraft("");
      if (text.startsWith("/")) {
        // Try to resolve directly if user hits Enter without using the menu.
        const raw = text.slice(1).trim();
        const [name, ...rest] = raw.split(/\s+/);
        const match = SLASH_COMMANDS.find((c) => c.name === name?.toLowerCase());
        if (match) {
          handleSlashSelect(match, rest.join(" ").trim() || undefined);
          return;
        }
      }
      sendMessage(text);
    },
    [handleSlashSelect, sendMessage],
  );

  const ctx = briefing?.context ?? null;

  const paywallNode = useMemo(
    () => (
      <PaywallGate requiredPlan="pro">
        <div />
      </PaywallGate>
    ),
    [],
  );

  if (paywall) return paywallNode;

  return (
    <div className="flex h-[calc(100dvh-14rem)] flex-col gap-4">
      {/* Context chips */}
      <ContextChips
        accountName={ctx?.accountName ?? null}
        todayPnlUsd={ctx?.todayPnlUsd ?? null}
        openPositionsCount={ctx?.openPositionsCount ?? 0}
        nextEvent={ctx?.nextEvent ?? null}
      />

      {/* Scrollable conversation area */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {!briefingShown && (briefing || briefingLoading) && (
          <div className="mb-4">
            <CompanionBriefing
              briefing={briefing ?? { summary: "", quickReplies: [] }}
              loading={briefingLoading && !briefing}
              onAsk={(text) => {
                markShown();
                sendMessage(text);
              }}
              onDismiss={markShown}
            />
          </div>
        )}

        {!hasMessages && !briefingLoading && !briefing && (
          <div className="mt-10 flex flex-col items-center justify-center text-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {hasMessages && (
          <div className="space-y-5 pb-4">
            {messages.map((msg, i) => {
              const isLast = i === messages.length - 1;
              const isAssistant = msg.role === "assistant";
              const emptyStreaming = isAssistant && isLast && streaming && msg.content.length === 0;
              return (
                <ChatMessage
                  key={msg.id ?? `m-${i}`}
                  role={msg.role}
                  content={emptyStreaming ? "Pensando..." : msg.content}
                  isStreaming={streaming && isLast && isAssistant}
                />
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}

        {errorMsg && !streaming && (
          <p className="mt-2 text-xs text-rose-400">{errorMsg}</p>
        )}
      </div>

      {/* Input area with slash menu overlay */}
      <div className="relative">
        {slashOpen && slashQuery !== null && (
          <SlashCommandMenu
            query={slashQuery}
            onSelect={handleSlashSelect}
            onClose={() => {
              setSlashOpen(false);
              setSlashQuery(null);
            }}
          />
        )}
        <ChatInput
          onSubmit={handleSubmit}
          disabled={streaming}
          placeholder="Fala com o Ticker — digite / para comandos..."
          onSlash={handleSlashChange}
          value={inputDraft}
        />
      </div>
    </div>
  );
}
