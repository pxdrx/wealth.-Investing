"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import { X, Save, Tag, FileText } from "lucide-react";

interface DayDetailModalProps {
  date: string | null;
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNoteSaved?: () => void;
}

interface AccountTradesSummary {
  accountId: string;
  accountName: string;
  trades: number;
  wins: number;
  losses: number;
  breakeven: number;
  pnl: number;
}

interface DayNote {
  id?: string;
  observation: string;
  tags: string[];
}

const TAG_PRESETS = [
  "Plano seguido",
  "Setup A+",
  "Risk management OK",
  "Overtrading",
  "Revenge trade",
  "Gestão emocional",
  "Antecipação de entrada",
  "Saída prematura",
  "Sem stop definido",
  "Notícia macro",
  "Volatilidade atípica",
  "Mercado lateralizado",
  "Trend day",
  "Sessão London",
  "Sessão NY",
];

export function DayDetailModal({ date, userId, open, onOpenChange, onNoteSaved }: DayDetailModalProps) {
  const [accountSummaries, setAccountSummaries] = useState<AccountTradesSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [dayNote, setDayNote] = useState<DayNote>({ observation: "", tags: [] });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newTag, setNewTag] = useState("");

  const loadDayData = useCallback(async () => {
    if (!date || !userId) return;
    setLoading(true);
    setSaved(false);

    try {
      // Use local time to match PnlCalendar's date key logic (which uses getMonth/getDate)
      const startOfDay = new Date(date + "T00:00:00").toISOString();
      const endOfDay = new Date(date + "T23:59:59.999").toISOString();

      const [tradesRes, accountsRes] = await Promise.all([
        supabase
          .from("journal_trades")
          .select("account_id, net_pnl_usd, pnl_usd, fees_usd, symbol, direction")
          .eq("user_id", userId)
          .gte("opened_at", startOfDay)
          .lte("opened_at", endOfDay),
        supabase
          .from("accounts")
          .select("id, name, kind")
          .eq("user_id", userId),
      ]);

      // Try loading day notes — table may not exist yet
      let noteResult: { id: string; observation: string; tags: string[] } | null = null;
      {
        const noteRes = await supabase
          .from("day_notes")
          .select("id, observation, tags")
          .eq("user_id", userId)
          .eq("date", date)
          .maybeSingle();
        if (!noteRes.error && noteRes.data) {
          noteResult = noteRes.data as { id: string; observation: string; tags: string[] };
        }
      }

      const accountNames = new Map<string, string>();
      for (const acc of accountsRes.data ?? []) {
        const a = acc as { id: string; name: string };
        accountNames.set(a.id, a.name);
      }

      const byAccount = new Map<string, AccountTradesSummary>();
      for (const row of tradesRes.data ?? []) {
        const r = row as {
          account_id: string | null;
          net_pnl_usd: number | null;
          pnl_usd: number | null;
          fees_usd: number | null;
        };
        if (!r.account_id) continue;
        const net = typeof r.net_pnl_usd === "number" && !Number.isNaN(r.net_pnl_usd)
          ? r.net_pnl_usd
          : (r.pnl_usd ?? 0) + (r.fees_usd ?? 0);

        if (!byAccount.has(r.account_id)) {
          byAccount.set(r.account_id, {
            accountId: r.account_id,
            accountName: accountNames.get(r.account_id) ?? "Conta",
            trades: 0, wins: 0, losses: 0, breakeven: 0, pnl: 0,
          });
        }
        const s = byAccount.get(r.account_id)!;
        s.trades += 1;
        s.pnl += net;
        if (net > 0) s.wins += 1;
        else if (net < 0) s.losses += 1;
        else s.breakeven += 1;
      }

      setAccountSummaries(Array.from(byAccount.values()).sort((a, b) => b.pnl - a.pnl));

      if (noteResult) {
        setDayNote({
          id: noteResult.id,
          observation: noteResult.observation ?? "",
          tags: Array.isArray(noteResult.tags) ? noteResult.tags : [],
        });
      } else {
        setDayNote({ observation: "", tags: [] });
      }
    } catch {
      setAccountSummaries([]);
      setDayNote({ observation: "", tags: [] });
    } finally {
      setLoading(false);
    }
  }, [date, userId]);

  useEffect(() => {
    if (open && date && userId) loadDayData();
  }, [open, date, userId, loadDayData]);

  const handleSaveNote = async () => {
    if (!date || !userId) return;
    setSaving(true);
    setSaved(false);
    try {
      if (dayNote.id) {
        await supabase
          .from("day_notes")
          .update({ observation: dayNote.observation, tags: dayNote.tags, updated_at: new Date().toISOString() })
          .eq("id", dayNote.id);
      } else {
        const { data } = await supabase
          .from("day_notes")
          .insert({ user_id: userId, date, observation: dayNote.observation, tags: dayNote.tags })
          .select("id")
          .maybeSingle();
        if (data) setDayNote((prev) => ({ ...prev, id: (data as { id: string }).id }));
      }
      setSaved(true);
      onNoteSaved?.();
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // table may not exist
    } finally {
      setSaving(false);
    }
  };

  const toggleTag = (tag: string) => {
    setDayNote((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  const addCustomTag = () => {
    const t = newTag.trim();
    if (t && !dayNote.tags.includes(t)) {
      setDayNote((prev) => ({ ...prev, tags: [...prev.tags, t] }));
      setNewTag("");
    }
  };

  const totalPnl = accountSummaries.reduce((sum, a) => sum + a.pnl, 0);
  const totalTrades = accountSummaries.reduce((sum, a) => sum + a.trades, 0);

  const formattedDate = date
    ? new Date(date + "T12:00:00").toLocaleDateString("pt-BR", {
        weekday: "long", day: "2-digit", month: "long", year: "numeric",
      })
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto" showClose={true}>
        <DialogHeader>
          <DialogTitle className="capitalize">{formattedDate}</DialogTitle>
          <DialogDescription>
            {totalTrades > 0
              ? `${totalTrades} operação${totalTrades !== 1 ? "ões" : ""} em ${accountSummaries.length} conta${accountSummaries.length !== 1 ? "s" : ""}`
              : "Nenhuma operação neste dia"}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 rounded-lg bg-muted/20 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Day total */}
            {totalTrades > 0 && (
              <div className={cn(
                "rounded-lg border p-4 text-center",
                totalPnl > 0 ? "border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/30"
                : totalPnl < 0 ? "border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-950/30"
                : "border-border/40 bg-muted/10"
              )}>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Resultado do Dia</p>
                <p className={cn(
                  "text-2xl font-bold",
                  totalPnl > 0 ? "text-emerald-700 dark:text-emerald-400"
                  : totalPnl < 0 ? "text-red-700 dark:text-red-400"
                  : "text-foreground"
                )}>
                  {totalPnl > 0 ? "+" : ""}{totalPnl < 0 ? "-" : ""}${Math.abs(totalPnl).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            )}

            {/* Per-account breakdown */}
            {accountSummaries.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Por conta</h4>
                {accountSummaries.map((acc) => (
                  <div
                    key={acc.accountId}
                    className="flex items-center justify-between rounded-lg border border-border/30 px-3 py-2.5"
                    style={{ backgroundColor: "hsl(var(--muted) / 0.06)" }}
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{acc.accountName}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {acc.trades} ops — {acc.wins}W / {acc.losses}L{acc.breakeven > 0 ? ` / ${acc.breakeven}BE` : ""}
                      </p>
                    </div>
                    <p className={cn(
                      "text-sm font-bold tabular-nums",
                      acc.pnl > 0 ? "text-emerald-700 dark:text-emerald-400"
                      : acc.pnl < 0 ? "text-red-700 dark:text-red-400"
                      : "text-muted-foreground"
                    )}>
                      {acc.pnl > 0 ? "+" : ""}{acc.pnl < 0 ? "-" : ""}${Math.abs(acc.pnl).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Tags */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Etiquetas</h4>
              </div>
              <div className="flex flex-wrap gap-1">
                {TAG_PRESETS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      "rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                      dayNote.tags.includes(tag)
                        ? "bg-blue-500/15 text-blue-700 dark:text-blue-400 ring-1 ring-blue-500/30"
                        : "bg-muted/20 text-muted-foreground hover:bg-muted/40"
                    )}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              {dayNote.tags.filter((t) => !TAG_PRESETS.includes(t)).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {dayNote.tags.filter((t) => !TAG_PRESETS.includes(t)).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-md bg-blue-500/15 text-blue-700 dark:text-blue-400 ring-1 ring-blue-500/30 px-2 py-1 text-[11px] font-medium"
                    >
                      {tag}
                      <button type="button" onClick={() => toggleTag(tag)} className="hover:text-red-500">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-1.5">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomTag())}
                  placeholder="Tag personalizada..."
                  className="flex-1 h-7 text-xs"
                />
                <Button type="button" variant="outline" size="sm" className="h-7 text-[11px] px-2" onClick={addCustomTag}>
                  +
                </Button>
              </div>
            </div>

            {/* Observation */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Observação</h4>
              </div>
              <textarea
                value={dayNote.observation}
                onChange={(e) => setDayNote((prev) => ({ ...prev, observation: e.target.value }))}
                placeholder="Contexto do mercado, lições aprendidas, ajustes para o próximo dia..."
                rows={3}
                className="w-full resize-y rounded-lg border border-border/40 bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
              />
            </div>

            {/* Save */}
            <Button onClick={handleSaveNote} disabled={saving} className="w-full gap-2" variant={saved ? "outline" : "default"}>
              {saved ? (
                <>Salvo</>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  {saving ? "Salvando…" : dayNote.id ? "Atualizar observação" : "Salvar observação"}
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
