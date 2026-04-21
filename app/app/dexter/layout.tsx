"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bot } from "lucide-react";
import { useActiveAccount } from "@/components/context/ActiveAccountContext";
import { safeGetSession } from "@/lib/supabase/safe-session";
import { cn } from "@/lib/utils";

type Mood = "calm" | "focused" | "accelerated" | "drifting" | "flow";

const MOOD_LABEL_PT: Record<Mood, string> = {
  calm: "Calmo",
  focused: "Focado",
  flow: "Em flow",
  accelerated: "Acelerado",
  drifting: "Em deriva",
};

const MOOD_TONE: Record<Mood, string> = {
  calm: "bg-white/5 text-white/80",
  focused: "bg-sky-500/10 text-sky-200",
  flow: "bg-emerald-500/15 text-emerald-200",
  accelerated: "bg-amber-500/15 text-amber-200",
  drifting: "bg-rose-500/15 text-rose-200",
};

interface Tab {
  id: "chat" | "coach" | "analyst";
  label: string;
  href: string;
}

const TABS: readonly Tab[] = [
  { id: "chat",    label: "Chat",    href: "/app/dexter/chat" },
  { id: "coach",   label: "Coach",   href: "/app/dexter/coach" },
  { id: "analyst", label: "Analyst", href: "/app/dexter/analyst" },
];

function useTodayMood(accountId: string | null): Mood | null {
  const [mood, setMood] = useState<Mood | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!accountId) {
      setMood(null);
      return;
    }
    (async () => {
      const { data: { session } } = await safeGetSession();
      if (cancelled || !session) return;
      try {
        const res = await fetch(
          `/api/dashboard/today-stats?account_id=${encodeURIComponent(accountId)}`,
          { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" },
        );
        if (cancelled || !res.ok) return;
        const data = (await res.json()) as { mood?: { state?: Mood } };
        if (!cancelled && data.mood?.state) setMood(data.mood.state);
      } catch {
        // silent — mood chip simply stays hidden on error
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accountId]);
  return mood;
}

export default function DexterLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { activeAccountId } = useActiveAccount();
  const mood = useTodayMood(activeAccountId);

  // Active tab: /app/dexter/<tab>. Default to chat for bare /app/dexter.
  const activeIndex = Math.max(
    0,
    TABS.findIndex((t) => pathname?.startsWith(t.href)),
  );

  // Arrow-left / arrow-right keyboard nav between tabs.
  const listRef = useRef<HTMLDivElement>(null);
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const delta = e.key === "ArrowLeft" ? -1 : 1;
    const next = (activeIndex + delta + TABS.length) % TABS.length;
    router.push(TABS[next].href);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-500/15 text-emerald-300">
          <Bot className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground leading-none">
            Dexter
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Seu analista sênior. Chat direto, coach reflexivo, analyst quantitativo.
          </p>
        </div>
        {mood && (
          <span
            aria-label="Estado do trader"
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
              MOOD_TONE[mood],
            )}
          >
            {MOOD_LABEL_PT[mood]}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div
        ref={listRef}
        role="tablist"
        aria-label="Modos do Dexter"
        onKeyDown={onKeyDown}
        className="mb-6 flex gap-6 border-b border-border/60"
      >
        {TABS.map((tab, i) => {
          const active = i === activeIndex;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              className={cn(
                "relative -mb-px pb-3 pt-1 text-sm font-medium transition-colors",
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
              {active && (
                <span
                  aria-hidden
                  className="absolute inset-x-0 -bottom-px h-[2px] bg-emerald-500"
                />
              )}
            </Link>
          );
        })}
      </div>

      {/* Tab outlet */}
      <div>{children}</div>
    </div>
  );
}
