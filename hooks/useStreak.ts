"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { toForexDateKey } from "@/lib/trading/forex-day";

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  totalTrades: number;
  totalDays: number;
  firstTradeDate: string | null;
  isLoading: boolean;
}

/**
 * Calculates trading streak (consecutive days with logged trades)
 * and accumulation stats for the current user.
 */
export function useStreak(userId: string | null | undefined): StreakData {
  const [data, setData] = useState<StreakData>({
    currentStreak: 0,
    longestStreak: 0,
    totalTrades: 0,
    totalDays: 0,
    firstTradeDate: null,
    isLoading: true,
  });

  useEffect(() => {
    if (!userId) return;

    async function fetchStreak() {
      // Get all distinct trade dates for this user, ordered descending
      const { data: rows, error } = await supabase
        .from("journal_trades")
        .select("opened_at")
        .eq("user_id", userId!)
        .order("opened_at", { ascending: false });

      if (error || !rows || rows.length === 0) {
        setData({
          currentStreak: 0,
          longestStreak: 0,
          totalTrades: 0,
          totalDays: 0,
          firstTradeDate: null,
          isLoading: false,
        });
        return;
      }

      // Extract unique forex-day keys (17:00-ET rollover).
      const dateSet = new Set<string>();
      for (const row of rows) {
        dateSet.add(toForexDateKey(row.opened_at));
      }

      const sortedDates = Array.from(dateSet).sort().reverse();

      // Calculate current streak (from today backwards)
      const today = new Date();
      const todayStr = toForexDateKey(today.toISOString());

      let currentStreak = 0;
      let checkDate = new Date(today);

      // Allow streak to start from today or yesterday
      const startFromToday = sortedDates[0] === todayStr;
      if (!startFromToday) {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = toForexDateKey(yesterday.toISOString());
        if (sortedDates[0] !== yesterdayStr) {
          currentStreak = 0;
        } else {
          checkDate = yesterday;
        }
      }

      if (currentStreak === 0 && (startFromToday || sortedDates[0] === formatDateStr(new Date(today.getTime() - 86400000)))) {
        // Count consecutive days backwards
        const d = new Date(startFromToday ? today : new Date(today.getTime() - 86400000));
        while (dateSet.has(formatDateStr(d))) {
          currentStreak++;
          d.setDate(d.getDate() - 1);
        }
      }

      // Calculate longest streak
      let longestStreak = 0;
      let tempStreak = 1;
      const ascending = Array.from(dateSet).sort();
      for (let i = 1; i < ascending.length; i++) {
        const prev = new Date(ascending[i - 1]);
        const curr = new Date(ascending[i]);
        const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000);
        if (diffDays === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);

      setData({
        currentStreak,
        longestStreak,
        totalTrades: rows.length,
        totalDays: dateSet.size,
        firstTradeDate: ascending[0] ?? null,
        isLoading: false,
      });
    }

    fetchStreak();
  }, [userId]);

  return data;
}

function formatDateStr(d: Date): string {
  return toForexDateKey(d.toISOString());
}
