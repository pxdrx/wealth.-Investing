// [C-10] Hook that surfaces the distinct symbols the current user has traded
// recently (60-day window, all accounts). Used to scope macro feeds to the
// user's actual exposure.
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { currenciesForSymbols, countriesForCurrencies } from "@/lib/macro/asset-currency-map";

const WINDOW_DAYS = 60;

export interface MyAssets {
  symbols: string[];
  currencies: string[];
  countries: string[];
  loading: boolean;
  error: string | null;
}

export function useMyAssets(): MyAssets {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          if (!cancelled) { setSymbols([]); setLoading(false); }
          return;
        }
        const since = new Date();
        since.setDate(since.getDate() - WINDOW_DAYS);
        const { data, error: err } = await supabase
          .from("journal_trades")
          .select("symbol")
          .eq("user_id", session.user.id)
          .gte("opened_at", since.toISOString())
          .not("symbol", "is", null)
          .limit(5000);
        if (cancelled) return;
        if (err) {
          setError(err.message);
          setSymbols([]);
        } else {
          const distinct = Array.from(
            new Set((data ?? []).map((r) => String(r.symbol ?? "").toUpperCase()).filter(Boolean)),
          );
          setSymbols(distinct);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load symbols");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const currencies = currenciesForSymbols(symbols);
  const countries = countriesForCurrencies(currencies);

  return { symbols, currencies, countries, loading, error };
}
