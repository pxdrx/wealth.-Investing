"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
import { X, Save, Tag, FileText, Pencil, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface DayDetailModalProps {
  date: string | null;
  userId: string | null;
  accountId?: string | null;
  /** When set, only show trades from these accounts (e.g. backtest-only view) */
  accountIds?: string[];
  /** When true, modal opens in read-only mode with a single "Editar" button */
  defaultReadOnly?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNoteSaved?: () => void;
  /** Called after a trade is deleted so parent can refresh */
  onTradeDeleted?: () => void;
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

interface IndividualTrade {
  id: string;
  symbol: string;
  direction: string;
  net_pnl_usd: number;
  opened_at: string;
  account_id: string;
  accountName: string;
}

interface DayNote {
  id?: string;
  observation: string;
  tags: string[];
}

export function DayDetailModal({ date, userId, accountId, accountIds, defaultReadOnly, open, onOpenChange, onNoteSaved, onTradeDeleted }: DayDetailModalProps) {
  const [accountSummaries, setAccountSummaries] = useState<AccountTradesSummary[]>([]);
  const [individualTrades, setIndividualTrades] = useState<IndividualTrade[]>([]);
  const [deletingTradeId, setDeletingTradeId] = useState<string | null>(null);
  const [confirmingTradeId, setConfirmingTradeId] = useState<string | null>(null);
  const pendingRefresh = useRef(false);
  const [loading, setLoading] = useState(false);
  const [dayNote, setDayNote] = useState<DayNote>({ observation: "", tags: [] });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [userSavedTags, setUserSavedTags] = useState<string[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Track original note state for auto-save on close
  const originalNote = useRef<{ observation: string; tags: string[] }>({ observation: "", tags: [] });

  const isDirty = (): boolean => {
    const orig = originalNote.current;
    if (dayNote.observation !== orig.observation) return true;
    if (dayNote.tags.length !== orig.tags.length) return true;
    for (let i = 0; i < dayNote.tags.length; i++) {
      if (dayNote.tags[i] !== orig.tags[i]) return true;
    }
    return false;
  };

  // Load user's saved tags from DB
  const loadUserTags = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("user_tags")
      .select("tag")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (data) setUserSavedTags(data.map((r: { tag: string }) => r.tag));
  }, [userId]);

  const saveUserTag = useCallback(async (tag: string) => {
    if (!userId || userSavedTags.includes(tag)) return;
    await supabase.from("user_tags").insert({ user_id: userId, tag });
    setUserSavedTags((prev) => [...prev, tag]);
  }, [userId, userSavedTags]);

  const deleteUserTag = useCallback(async (tag: string) => {
    if (!userId) return;
    await supabase.from("user_tags").delete().eq("user_id", userId).eq("tag", tag);
    setUserSavedTags((prev) => prev.filter((t) => t !== tag));
  }, [userId]);

  // Load user tags when modal opens
  useEffect(() => {
    if (open && userId) loadUserTags();
  }, [open, userId, loadUserTags]);

  const loadDayData = useCallback(async () => {
    if (!date || !userId) { setLoading(false); return; }
    setLoading(true);
    setSaved(false);
    setConfirmingTradeId(null);

    try {
      // Expand range by ±12h to catch any timezone edge cases (UTC vs local vs MT5)
      // Then filter client-side by local date for precision
      const baseDate = new Date(date + "T00:00:00");
      const startOfDay = new Date(baseDate.getTime() - 12 * 60 * 60 * 1000).toISOString();
      const endOfDay = new Date(baseDate.getTime() + 36 * 60 * 60 * 1000).toISOString();

      let tradesQuery = supabase
        .from("journal_trades")
        .select("id, account_id, net_pnl_usd, pnl_usd, fees_usd, symbol, direction, opened_at")
        .eq("user_id", userId)
        .gte("opened_at", startOfDay)
        .lte("opened_at", endOfDay);
      if (accountId) {
        tradesQuery = tradesQuery.eq("account_id", accountId);
      } else if (accountIds && accountIds.length > 0) {
        tradesQuery = tradesQuery.in("account_id", accountIds);
      }

      const [tradesRes, accountsRes] = await Promise.all([
        tradesQuery,
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
      const tradesList: IndividualTrade[] = [];
      // Client-side filter: match trades whose opened_at falls on the selected local date
      const allRows = (tradesRes.data ?? []).filter((row) => {
        const r = row as { opened_at: string };
        if (!r.opened_at) return false;
        const d = new Date(r.opened_at);
        const localKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        return localKey === date;
      });
      for (const row of allRows) {
        const r = row as {
          id: string;
          account_id: string | null;
          net_pnl_usd: number | null;
          pnl_usd: number | null;
          fees_usd: number | null;
          symbol: string | null;
          direction: string | null;
          opened_at: string;
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

        tradesList.push({
          id: r.id,
          symbol: r.symbol ?? "—",
          direction: r.direction ?? "—",
          net_pnl_usd: net,
          opened_at: r.opened_at,
          account_id: r.account_id,
          accountName: accountNames.get(r.account_id) ?? "Conta",
        });
      }

      setAccountSummaries(Array.from(byAccount.values()).sort((a, b) => b.pnl - a.pnl));
      setIndividualTrades(tradesList.sort((a, b) => a.opened_at.localeCompare(b.opened_at)));

      if (noteResult) {
        const obs = noteResult.observation ?? "";
        const tgs = Array.isArray(noteResult.tags) ? noteResult.tags : [];
        setDayNote({ id: noteResult.id, observation: obs, tags: tgs });
        originalNote.current = { observation: obs, tags: [...tgs] };
        setEditMode(false);
      } else {
        setDayNote({ observation: "", tags: [] });
        originalNote.current = { observation: "", tags: [] };
        setEditMode(defaultReadOnly ? false : true);
      }
    } catch {
      setAccountSummaries([]);
      setIndividualTrades([]);
      setDayNote({ observation: "", tags: [] });
    } finally {
      setLoading(false);
    }
  // JSON.stringify(accountIds) is used for stable array comparison since
  // accountIds is a new array reference on each render. This is intentional
  // and the standard workaround for array dependencies.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, userId, accountId, JSON.stringify(accountIds)]);

  useEffect(() => {
    if (open && date && userId) loadDayData();
  }, [open, date, userId, loadDayData]);

  const handleSaveNote = async () => {
    if (!date || !userId) return;
    setSaving(true);
    setSaved(false);
    setSaveError(null);
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
      setEditMode(false);
      originalNote.current = { observation: dayNote.observation, tags: [...dayNote.tags] };
      onNoteSaved?.();
      // Close modal after save
      onOpenChange(false);
    } catch (err) {
      console.warn("[DayDetailModal] save error", err);
      setSaveError("Erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTrade = async (tradeId: string) => {
    if (!userId) return;
    setConfirmingTradeId(null);
    setDeletingTradeId(tradeId);
    try {
      const { error } = await supabase
        .from("journal_trades")
        .delete()
        .eq("id", tradeId)
        .eq("user_id", userId);
      if (error) {
        console.error("[DayDetailModal] delete error:", error);
        setDeletingTradeId(null);
        return;
      }
      // Optimistic removal: update local state instead of reloading
      const deleted = individualTrades.find((t) => t.id === tradeId);
      setIndividualTrades((prev) => prev.filter((t) => t.id !== tradeId));
      if (deleted) {
        setAccountSummaries((prev) => {
          const updated = prev.map((acc) => {
            if (acc.accountId !== deleted.account_id) return acc;
            const net = deleted.net_pnl_usd;
            return {
              ...acc,
              trades: acc.trades - 1,
              pnl: acc.pnl - net,
              wins: net > 0 ? acc.wins - 1 : acc.wins,
              losses: net < 0 ? acc.losses - 1 : acc.losses,
              breakeven: net === 0 ? acc.breakeven - 1 : acc.breakeven,
            };
          });
          return updated.filter((acc) => acc.trades > 0);
        });
      }
      // Defer parent refresh to modal close to prevent page re-render while modal is open
      pendingRefresh.current = true;
    } catch (err) {
      console.error("[DayDetailModal] delete error:", err);
    } finally {
      setDeletingTradeId(null);
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
      saveUserTag(t); // Persist for future use
      setNewTag("");
    }
  };

  // Auto-save unsaved changes when modal closes + flush pending refresh
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      if (editMode && isDirty() && date && userId) {
        handleSaveNote().catch((err) => {
          console.warn("[DayDetailModal] auto-save on close failed:", err);
        });
      }
      // Flush deferred parent refresh after trade deletion
      if (pendingRefresh.current) {
        pendingRefresh.current = false;
        onTradeDeleted?.();
      }
    }
    onOpenChange(nextOpen);
  };

  const totalPnl = accountSummaries.reduce((sum, a) => sum + a.pnl, 0);
  const totalTrades = accountSummaries.reduce((sum, a) => sum + a.trades, 0);

  const formattedDate = date
    ? new Date(date + "T12:00:00").toLocaleDateString("pt-BR", {
        weekday: "long", day: "2-digit", month: "long", year: "numeric",
      })
    : "";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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

            {/* Individual trades with delete */}
            {individualTrades.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Operações</h4>
                <AnimatePresence initial={false}>
                  {individualTrades.map((t) => {
                    const dirLower = t.direction.toLowerCase();
                    const isBuy = dirLower === "buy" || dirLower === "long";
                    const dt = new Date(t.opened_at);
                    const time = dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false });
                    const dayMonth = `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}`;
                    const isConfirming = confirmingTradeId === t.id;
                    const isDeleting = deletingTradeId === t.id;
                    return (
                      <motion.div
                        key={t.id}
                        layout
                        initial={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0, overflow: "hidden" }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        className={cn(
                          "rounded-lg border px-3 py-2 transition-colors",
                          isConfirming
                            ? "border-red-300 dark:border-red-800/60 bg-red-50 dark:bg-red-950/30"
                            : "border-border/30"
                        )}
                        style={!isConfirming ? { backgroundColor: "hsl(var(--muted) / 0.06)" } : undefined}
                      >
                        {isConfirming ? (
                          /* ── Inline confirmation ── */
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                              <span className="text-sm font-medium text-red-700 dark:text-red-400">
                                Excluir {t.symbol}?
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setConfirmingTradeId(null)}
                                className="rounded-md px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                              >
                                Não
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteTrade(t.id)}
                                disabled={isDeleting}
                                className="rounded-md px-2.5 py-1 text-[11px] font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                              >
                                {isDeleting ? "Excluindo..." : "Sim, excluir"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* ── Normal trade row ── */
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm font-medium text-foreground">{t.symbol}</span>
                                  <span className={cn(
                                    "rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase",
                                    isBuy ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-red-500/10 text-red-700 dark:text-red-400"
                                  )}>
                                    {t.direction}
                                  </span>
                                </div>
                                <span className="text-[10px] text-muted-foreground">
                                  {time} · {dayMonth}{accountSummaries.length > 1 ? ` · ${t.accountName}` : ""}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "text-sm font-bold tabular-nums",
                                t.net_pnl_usd > 0 ? "text-emerald-700 dark:text-emerald-400"
                                : t.net_pnl_usd < 0 ? "text-red-700 dark:text-red-400"
                                : "text-muted-foreground"
                              )}>
                                {t.net_pnl_usd > 0 ? "+" : ""}{t.net_pnl_usd < 0 ? "-" : ""}${Math.abs(t.net_pnl_usd).toFixed(2)}
                              </span>
                              <button
                                type="button"
                                onClick={() => setConfirmingTradeId(t.id)}
                                className="rounded-md p-1 text-muted-foreground/50 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                title="Excluir trade"
                                aria-label={`Excluir trade ${t.symbol}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}

            {/* Notes section — View or Edit mode */}
            {!editMode && (dayNote.id || defaultReadOnly) ? (
              /* ---- VIEW MODE ---- */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Observação</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditMode(true)}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                  >
                    <Pencil className="h-3 w-3" />
                    Editar
                  </button>
                </div>

                {/* Tags as read-only badges */}
                {dayNote.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {dayNote.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400 px-2.5 py-0.5 text-[11px] font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Observation text in a subtle container */}
                {dayNote.observation && (
                  <div
                    className="rounded-lg border border-border/30 px-3.5 py-3 text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap"
                    style={{ backgroundColor: "hsl(var(--muted) / 0.06)" }}
                  >
                    {dayNote.observation}
                  </div>
                )}

                {saved && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium text-center">Salvo</p>
                )}
              </div>
            ) : (
              /* ---- EDIT MODE ---- */
              <div className="space-y-4">
                {/* Tags */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Etiquetas</h4>
                  </div>
                  {/* Applied tags — removable chips */}
                  {dayNote.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {dayNote.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium bg-blue-500/15 text-blue-700 dark:text-blue-400 ring-1 ring-blue-500/30"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => toggleTag(tag)}
                            className="ml-0.5 opacity-50 hover:opacity-100 hover:text-red-500 transition-opacity"
                            title="Remover etiqueta"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {/* User saved tags as quick-add buttons (only show tags not already applied) */}
                  {userSavedTags.filter((t) => !dayNote.tags.includes(t)).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {userSavedTags.filter((t) => !dayNote.tags.includes(t)).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium bg-muted/20 text-muted-foreground hover:bg-muted/40 transition-colors"
                        >
                          <button type="button" onClick={() => toggleTag(tag)} className="cursor-pointer">
                            {tag}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); deleteUserTag(tag); }}
                            className="ml-0.5 opacity-50 hover:opacity-100 hover:text-red-500 transition-opacity"
                            title="Excluir etiqueta salva"
                          >
                            <X className="h-2.5 w-2.5" />
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

                {saveError && (
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium">{saveError}</p>
                )}

                {/* Save + Cancel */}
                <div className="flex gap-2">
                  {dayNote.id && (
                    <Button type="button" variant="outline" className="flex-1" onClick={() => { setEditMode(false); loadDayData(); }}>
                      Cancelar
                    </Button>
                  )}
                  <Button onClick={handleSaveNote} disabled={saving} className={cn("gap-2", dayNote.id ? "flex-1" : "w-full")} variant={saved ? "outline" : "default"}>
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
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
