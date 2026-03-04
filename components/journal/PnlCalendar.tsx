"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";

interface PnlCalendarProps {
  accountId: string | null;
  /** Quando true, usa userId e soma PnL de todas as contas do usuário. */
  allAccounts?: boolean;
  /** Obrigatório quando allAccounts=true. */
  userId?: string | null;
}

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function PnlCalendar({ accountId, allAccounts = false, userId }: PnlCalendarProps) {
  const now = new Date();
  const [displayMonth, setDisplayMonth] = useState(now.getMonth());
  const [displayYear, setDisplayYear] = useState(now.getFullYear());
  const [dailyPnl, setDailyPnl] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (allAccounts) {
      if (!userId || typeof userId !== "string") {
        setDailyPnl({});
        return;
      }
    } else {
      if (!accountId || typeof accountId !== "string") {
        setDailyPnl({});
        return;
      }
    }

    setLoading(true);
    const startIso = new Date(displayYear, displayMonth, 1).toISOString();
    const endIso = new Date(displayYear, displayMonth + 1, 1).toISOString();

    (async () => {
      try {
        let query = supabase
          .from("journal_trades")
          .select("opened_at, net_pnl_usd, pnl_usd, fees_usd")
          .gte("opened_at", startIso)
          .lt("opened_at", endIso);

        if (allAccounts) {
          query = query.eq("user_id", userId as string);
        } else {
          query = query.eq("account_id", accountId as string);
        }

        const { data, error } = await query;

        if (error) {
          setDailyPnl({});
          return;
        }

        const byDay: Record<string, number> = {};
        for (const row of data ?? []) {
          const r = row as {
            opened_at: string | null;
            net_pnl_usd?: number | null;
            pnl_usd?: number | null;
            fees_usd?: number | null;
          };
          if (!r.opened_at) continue;
          const d = new Date(r.opened_at);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
            d.getDate(),
          ).padStart(2, "0")}`;
          const net =
            typeof r.net_pnl_usd === "number" && !Number.isNaN(r.net_pnl_usd)
              ? r.net_pnl_usd
              : (r.pnl_usd ?? 0) + (r.fees_usd ?? 0);
          byDay[key] = (byDay[key] ?? 0) + net;
        }
        setDailyPnl(byDay);
      } catch {
        setDailyPnl({});
      } finally {
        setLoading(false);
      }
    })();
  }, [accountId, allAccounts, userId, displayMonth, displayYear]);

  const daysInMonth = useMemo(
    () => new Date(displayYear, displayMonth + 1, 0).getDate(),
    [displayMonth, displayYear]
  );

  const goPrev = () => {
    if (displayMonth === 0) {
      setDisplayMonth(11);
      setDisplayYear((y) => y - 1);
    } else {
      setDisplayMonth((m) => m - 1);
    }
  };

  const goNext = () => {
    if (displayMonth === 11) {
      setDisplayMonth(0);
      setDisplayYear((y) => y + 1);
    } else {
      setDisplayMonth((m) => m + 1);
    }
  };

  const monthTitle = `${MONTH_NAMES[displayMonth]} ${displayYear}`;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={goPrev}
          aria-label="Mês anterior"
        >
          ‹
        </Button>
        <CardTitle className="text-base font-medium px-2">{monthTitle}</CardTitle>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={goNext}
          aria-label="Próximo mês"
        >
          ›
        </Button>
      </CardHeader>
      <CardContent>
        {loading && <p className="text-sm text-muted-foreground">Carregando PnL diário…</p>}
        {!loading && daysInMonth > 0 && (
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-[11px] text-muted-foreground">
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const key = `${displayYear}-${String(displayMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const value = dailyPnl[key] ?? 0;
              let bg = "bg-muted";
              let text = "text-foreground";
              if (value > 0) {
                bg = "bg-emerald-100 dark:bg-emerald-900/40";
                text = "text-emerald-900 dark:text-emerald-300";
              } else if (value < 0) {
                bg = "bg-red-100 dark:bg-red-900/40";
                text = "text-red-900 dark:text-red-300";
              }
              return (
                <div
                  key={key}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-input border border-border/70 px-1 py-1.5 min-h-[46px]",
                    bg
                  )}
                >
                  <span className="text-[10px] font-medium text-muted-foreground">{day}</span>
                  <span className={cn("text-[10px] font-semibold", text)}>
                    {value === 0 ? "—" : value > 0 ? `+${value.toFixed(0)}` : value.toFixed(0)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        {!loading && accountId && Object.keys(dailyPnl).length === 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            Nenhum trade importado ainda para este mês na conta selecionada.
          </p>
        )}
        {!loading && !accountId && (
          <p className="text-sm text-muted-foreground">Selecione uma conta para ver o PnL diário.</p>
        )}
      </CardContent>
    </Card>
  );
}
