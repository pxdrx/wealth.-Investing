"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { safeGetSession } from "@/lib/supabase/safe-session";

export interface BriefingContext {
  accountName: string | null;
  todayPnlUsd: number | null;
  todayTradeCount: number;
  openPositionsCount: number;
  nextEvent: { title: string; whenRelative: string } | null;
}

export interface BriefingPayload {
  summary: string;
  quickReplies: string[];
  context: BriefingContext;
}

interface UseCompanionContextResult {
  briefing: BriefingPayload | null;
  loading: boolean;
  shown: boolean;
  markShown: () => void;
}

function utcDayKey(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function storageKey(userId: string, accountId: string | null): string {
  return `companion_briefing:${userId}:${accountId ?? "none"}:${utcDayKey()}`;
}

export function useCompanionContext(
  userId: string,
  accountId: string | null,
): UseCompanionContextResult {
  const [briefing, setBriefing] = useState<BriefingPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [shown, setShown] = useState(false);
  const searchParams = useSearchParams();
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    // Skip fetching if URL has ?conversationId — user is resuming an existing chat.
    if (searchParams?.get("conversationId")) {
      setShown(true);
      return;
    }

    // If already dismissed for today, don't fetch.
    try {
      const key = storageKey(userId, accountId);
      if (typeof window !== "undefined" && window.localStorage.getItem(key) === "1") {
        setShown(true);
        return;
      }
    } catch {
      // localStorage may be blocked (private mode) — continue with fetch.
    }

    let cancelled = false;
    fetchedRef.current = true;

    (async () => {
      setLoading(true);
      try {
        const { data: { session } } = await safeGetSession();
        if (cancelled || !session?.access_token) {
          setLoading(false);
          return;
        }

        const qs = accountId ? `?accountId=${encodeURIComponent(accountId)}` : "";
        const res = await fetch(`/api/ai/companion/briefing${qs}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: "no-store",
        });
        if (cancelled) return;
        if (!res.ok) {
          setLoading(false);
          return;
        }
        const json = (await res.json()) as {
          ok: boolean;
          summary?: string;
          quickReplies?: string[];
          context?: BriefingContext;
        };
        if (cancelled) return;
        if (json.ok && json.summary && json.context) {
          setBriefing({
            summary: json.summary,
            quickReplies: json.quickReplies ?? [],
            context: json.context,
          });
        }
      } catch {
        // silent — briefing is best-effort
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, accountId, searchParams]);

  const markShown = useCallback(() => {
    setShown(true);
    try {
      const key = storageKey(userId, accountId);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, "1");
      }
    } catch {
      // ignore
    }
  }, [userId, accountId]);

  return { briefing, loading, shown, markShown };
}
