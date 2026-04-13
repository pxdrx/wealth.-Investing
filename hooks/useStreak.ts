"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

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

      // Extract unique dates (YYYY-MM-DD)
      const dateSet = new Set<string>();
      for (const row of rows) {
        const d = new Date(row.opened_at);
        dateSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
      }

      const sortedDates = Array.from(dateSet).sort().reverse();

      // Calculate current streak (from today backwards)
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

      let currentStreak = 0;
      let checkDate = new Date(today);

      // Allow streak to start from today or yesterday
      const startFromToday = sortedDates[0] === todayStr;
      if (!startFromToday) {
        // Check if yesterday has trades (streak still alive)
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
        if (sortedDates[0] !== yesterdayStr) {
          // Streak is broken
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
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
