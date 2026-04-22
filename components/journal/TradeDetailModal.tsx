"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDateTime, formatDuration, getNetPnl } from "./types";
import type { JournalTradeRow } from "./types";
import { supabase } from "@/lib/supabase/client";
import { Trash2, Star, MessageSquare } from "lucide-react";
import { TradeScreenshotUpload } from "./TradeScreenshotUpload";
import { deleteTradeScreenshot } from "@/lib/supabase/screenshot";
import { validateCustomTags } from "@/lib/psychology-tags";
import { TagPicker } from "./TagPicker";
import { useAppT } from "@/hooks/useAppLocale";

interface MentorNoteForTrade {
  id: string;
  content: string;
  rating: number | null;
  created_at: string;
  mentor_name: string;
}

interface TradeDetailModalProps {
  trade: JournalTradeRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
  onDeleted?: (tradeId: string) => void;
}

export function TradeDetailModal({ trade, open, onOpenChange, onSaved, onDeleted }: TradeDetailModalProps) {
  const t = useAppT();
  const [context, setContext] = useState("");
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [mentorNotes, setMentorNotes] = useState<MentorNoteForTrade[]>([]);

  const MAX_TAGS = 10;

  const [screenshotPath, setScreenshotPath] = useState<string | null>(null);

  useEffect(() => {
    if (trade) {
      setContext(trade.context ?? "");
      setCustomTags(Array.isArray(trade.custom_tags) ? [...trade.custom_tags] : []);
      setScreenshotPath(trade.screenshot_path ?? null);
      setToast(null);
      setMentorNotes([]);
    }
  }, [trade]);

  // Fetch mentor feedback attached to this trade (student view)
  useEffect(() => {
    if (!trade?.id || !open) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await fetch("/api/mentor/my-feedback", {
          cache: "no-store",
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const json = await res.json();
        if (!res.ok || !json.ok || cancelled) return;
        const filtered = (json.notes ?? []).filter(
          (n: { trade_id: string | null }) => n.trade_id === trade.id
        );
        setMentorNotes(filtered);
      } catch {
        // silent — student may not have a mentor
      }
    })();
    return () => { cancelled = true; };
  }, [trade?.id, open]);

  const handleSave = async () => {
    if (!trade) return;
    setSaving(true);
    setToast(null);
    try {
      const validatedTags = validateCustomTags(customTags, MAX_TAGS);

      const { error } = await supabase
        .from("journal_trades")
        .update({
          context: context || null,
          custom_tags: validatedTags.length ? validatedTags : null,
        })
        .eq("id", trade.id);

      if (error) throw error;
      setToast({ type: "success", message: t("tradeDetail.savedSuccess") });
      onSaved?.();
      setTimeout(() => {
        onOpenChange(false);
      }, 600);
    } catch (e) {
      setToast({ type: "error", message: t("tradeDetail.saveError") });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!trade?.id) return;
    if (!confirm(t("tradeDetail.confirmDelete"))) return;

    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        setToast({ type: "error", message: t("tradeDetail.sessionExpired") });
        return;
      }

      // Clean up screenshot from storage before deleting trade
      if (screenshotPath) {
        try {
          await deleteTradeScreenshot(session.user.id, trade.id, screenshotPath);
        } catch {
          // Non-blocking — proceed with trade deletion
        }
      }

      const { error } = await supabase
        .from("journal_trades")
        .delete()
        .eq("id", trade.id)
        .eq("user_id", session.user.id);

      if (error) {
        setToast({ type: "error", message: t("tradeDetail.deleteError") });
        return;
      }

      onOpenChange(false);
      if (onDeleted) {
        onDeleted(trade.id);
      } else {
        onSaved?.();
      }
    } catch (err) {
      console.error("[trade-detail] Delete error:", err);
      setToast({ type: "error", message: t("tradeDetail.deleteError") });
    } finally {
      setDeleting(false);
    }
  };

  if (!trade) return null;

  const net = getNetPnl(trade);
  const isWin = net > 0;
  const dirLower = (trade.direction ?? "").toLowerCase();
  const isBuy = dirLower === "buy";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" showClose={true}>
        <DialogHeader>
          <DialogTitle>{t("tradeDetail.title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">{t("tradeDetail.symbol")}</Label>
              <p className="font-medium">{trade.symbol}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t("tradeDetail.direction")}</Label>
              <p><Badge variant={isBuy ? "default" : "warning"} className="capitalize">{trade.direction ?? "—"}</Badge></p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t("tradeDetail.category")}</Label>
              <p className="text-sm">{trade.category ?? "—"}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t("tradeDetail.result")}</Label>
              <p><Badge variant={isWin ? "success" : "destructive"}>{isWin ? t("tradeDetail.win") : t("tradeDetail.loss")}</Badge></p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">{t("tradeDetail.openedAt")}</Label>
              <p className="text-sm">{formatDateTime(trade.opened_at)}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t("tradeDetail.closedAt")}</Label>
              <p className="text-sm">{formatDateTime(trade.closed_at)}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t("tradeDetail.duration")}</Label>
              <p className="text-sm">{formatDuration(trade.opened_at, trade.closed_at)}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">{t("tradeDetail.grossPnl")}</Label>
              <p className="text-sm">{(trade.pnl_usd ?? 0).toFixed(2)} USD</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t("tradeDetail.fees")}</Label>
              <p className="text-sm">{(trade.fees_usd ?? 0).toFixed(2)} USD</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t("tradeDetail.netPnl")}</Label>
              <p className={net >= 0 ? "text-emerald-600 dark:text-emerald-500 font-medium" : "text-red-600 dark:text-red-500 font-medium"}>
                {net >= 0 ? "+" : ""}{net.toFixed(2)} USD
              </p>
            </div>
          </div>

          {/* Screenshot */}
          <TradeScreenshotUpload
            tradeId={trade.id}
            existingPath={screenshotPath}
            onUploaded={(path) => {
              setScreenshotPath(path);
              onSaved?.();
            }}
            onDeleted={() => {
              setScreenshotPath(null);
              onSaved?.();
            }}
          />

          {mentorNotes.length > 0 && (
            <div className="space-y-2">
              {mentorNotes.map((n) => (
                <div
                  key={n.id}
                  className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/20"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-amber-900 dark:text-amber-300">
                      <MessageSquare className="h-3.5 w-3.5" />
                      {t("tradeDetail.mentorNote")} · {n.mentor_name}
                    </div>
                    {n.rating ? (
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={12}
                            className={
                              s <= (n.rating ?? 0)
                                ? "fill-amber-500 text-amber-500"
                                : "fill-transparent text-amber-900/30 dark:text-amber-300/30"
                            }
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <p className="text-sm text-amber-900/90 dark:text-amber-100/90 whitespace-pre-wrap">
                    {n.content}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="context">{t("tradeDetail.context")}</Label>
            <Input
              id="context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder={t("tradeDetail.contextPlaceholder")}
            />
          </div>

          {/* Tags — taxonomia + freeform */}
          <div className="space-y-2">
            <Label>{t("tradeDetail.tags")} <span className="text-muted-foreground text-xs">({customTags.length}/{MAX_TAGS})</span></Label>
            <TagPicker value={customTags} onChange={setCustomTags} allowFreeform maxTags={MAX_TAGS} />
          </div>

          {toast && (
            <div
              className={cn(
                "rounded-input border px-3 py-2 text-sm",
                toast.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                  : "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300"
              )}
            >
              {toast.message}
            </div>
          )}
        </div>

        <DialogFooter className="flex !justify-between items-center">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 transition-colors disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {deleting ? t("tradeDetail.deleting") : t("tradeDetail.deleteCta")}
          </button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("tradeDetail.closeCta")}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? t("tradeDetail.savingCta") : t("tradeDetail.saveCta")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
