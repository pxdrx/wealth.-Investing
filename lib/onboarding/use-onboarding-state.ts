"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { safeGetSession } from "@/lib/supabase/safe-session";
import {
  TIER_RANK,
  isTierName,
  type OnboardingState,
  type TierName,
} from "./types";

const CACHE_KEY = "wealth_onboarding_state_v1";

function readCache(): OnboardingState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const obj = parsed as Record<string, unknown>;
    const tier = obj.maxTierSeen;
    const tour = obj.tourCompletedAt;
    if (!isTierName(tier)) return null;
    if (tour !== null && typeof tour !== "string") return null;
    return { tourCompletedAt: tour, maxTierSeen: tier };
  } catch {
    return null;
  }
}

function writeCache(state: OnboardingState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(state));
  } catch {
    // localStorage quota exceeded or privacy mode — ignore
  }
}

interface UseOnboardingStateReturn {
  state: OnboardingState | null;
  isLoading: boolean;
  markTourCompleted: () => Promise<void>;
  markTierSeen: (tier: TierName) => Promise<void>;
}

/**
 * Reads `/api/onboarding/state` and exposes setters that POST back.
 *
 * - Hydrates from `localStorage` synchronously so first paint has data.
 * - Reconciles with server on mount (server is source of truth).
 * - `markTourCompleted` and `markTierSeen` are optimistic: they update local
 *   state + cache immediately, then PATCH the server in the background.
 * - `markTierSeen` is a no-op when the requested tier is not strictly higher
 *   than what's already stored (server enforces the same rule).
 */
export function useOnboardingState(): UseOnboardingStateReturn {
  const [state, setState] = useState<OnboardingState | null>(() => readCache());
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    (async () => {
      const {
        data: { session },
      } = await safeGetSession();
      if (!session?.access_token) {
        if (!cancelled && mountedRef.current) setIsLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/onboarding/state", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const json: unknown = await res.json();
        if (
          json &&
          typeof json === "object" &&
          (json as { ok?: unknown }).ok === true &&
          (json as { state?: unknown }).state &&
          typeof (json as { state: unknown }).state === "object"
        ) {
          const fetched = (json as { state: OnboardingState }).state;
          if (!cancelled && mountedRef.current) {
            setState(fetched);
            writeCache(fetched);
          }
        }
      } catch {
        // Network failure — keep cached state, surface nothing
      } finally {
        if (!cancelled && mountedRef.current) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, []);

  const patch = useCallback(async (body: Partial<OnboardingState>) => {
    const {
      data: { session },
    } = await safeGetSession();
    if (!session?.access_token) return;
    try {
      const res = await fetch("/api/onboarding/state", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      });
      const json: unknown = await res.json();
      if (
        json &&
        typeof json === "object" &&
        (json as { ok?: unknown }).ok === true &&
        (json as { state?: unknown }).state
      ) {
        const next = (json as { state: OnboardingState }).state;
        if (mountedRef.current) {
          setState(next);
          writeCache(next);
        }
      }
    } catch {
      // Server reconciliation failed — keep optimistic state
    }
  }, []);

  const markTourCompleted = useCallback(async () => {
    const nowIso = new Date().toISOString();
    const optimistic: OnboardingState = {
      tourCompletedAt: nowIso,
      maxTierSeen: state?.maxTierSeen ?? "free",
    };
    if (mountedRef.current) setState(optimistic);
    writeCache(optimistic);
    await patch({ tourCompletedAt: nowIso });
  }, [patch, state]);

  const markTierSeen = useCallback(
    async (tier: TierName) => {
      const current: TierName = state?.maxTierSeen ?? "free";
      if (TIER_RANK[tier] <= TIER_RANK[current]) return;
      const optimistic: OnboardingState = {
        tourCompletedAt: state?.tourCompletedAt ?? null,
        maxTierSeen: tier,
      };
      if (mountedRef.current) setState(optimistic);
      writeCache(optimistic);
      await patch({ maxTierSeen: tier });
    },
    [patch, state]
  );

  return { state, isLoading, markTourCompleted, markTierSeen };
}
