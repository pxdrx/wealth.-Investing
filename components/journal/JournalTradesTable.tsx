"use client";

import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { usePrivacy } from "@/components/context/PrivacyContext";
import { formatDateTime, formatDuration, getNetPnl } from "./types";
import type { JournalTradeRow } from "./types";
import { ListFilter, TrendingUp, Tag as TagIcon, X } from "lucide-react";
import { SETUP_TAGS, MISTAKE_TAGS } from "@/lib/psychology-tags";
import { StickyNote } from "lucide-react";
import { useAppT } from "@/hooks/useAppLocale";
import {
  PREDEFINED_TAGS,
  TAG_CATEGORY_LABELS,
  TAG_CATEGORY_ORDER,
  getSlugsByCategory,
  getTagBySlug,
  type TagCategory,
} from "@/lib/journal/tag-taxonomy";

const PAGE_SIZE = 15;

type DirectionFilter = "all" | "buy" | "sell";
type ResultFilter = "all" | "win" | "loss";

const CATEGORY_BTN_STYLES: Record<TagCategory, { on: string; off: string }> = {
  positive: {
    on: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/50",
    off: "border-emerald-500/25 text-emerald-700/70 dark:text-emerald-300/70 hover:border-emerald-500/50",
  },
  negative: {
    on: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/50",
    off: "border-red-500/25 text-red-700/70 dark:text-red-300/70 hover:border-red-500/50",
  },
  neutral: {
    on: "bg-muted text-foreground border-border",
    off: "border-border/50 text-muted-foreground hover:border-border",
  },
};

const TAG_PILL_STYLES: Record<TagCategory, { selected: string; idle: string }> = {
  positive: {
    selected: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/50",
    idle: "border-emerald-500/25 text-emerald-700/70 dark:text-emerald-300/70 hover:border-emerald-500/50 hover:bg-emerald-500/5",
  },
  negative: {
    selected: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/50",
    idle: "border-red-500/25 text-red-700/70 dark:text-red-300/70 hover:border-red-500/50 hover:bg-red-500/5",
  },
  neutral: {
    selected: "bg-muted text-foreground border-border",
    idle: "border-border/50 text-muted-foreground hover:border-border hover:bg-muted/50",
  },
};

interface JournalTradesTableProps {
  trades: JournalTradeRow[];
  onTradeClick: (trade: JournalTradeRow) => void;
}

export function JournalTradesTable({ trades, onTradeClick }: JournalTradesTableProps) {
  const tr = useAppT();
  const { mask } = usePrivacy();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [direction, setDirection] = useState<DirectionFilter>("all");
  const [result, setResult] = useState<ResultFilter>("all");
  const [symbolFilter, setSymbolFilter] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagPanelOpen, setTagPanelOpen] = useState(false);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let list = [...trades].sort((a, b) => new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime());
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      list = list.filter((t) => new Date(t.opened_at) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      list = list.filter((t) => new Date(t.opened_at) <= to);
    }
    if (direction !== "all") {
      const d = direction === "buy" ? "buy" : "sell";
      list = list.filter((t) => t.direction?.toLowerCase() === d);
    }
    if (result !== "all") {
      list = list.filter((t) => {
        const net = getNetPnl(t);
        if (result === "win") return net > 0;
        return net < 0;
      });
    }
    if (symbolFilter) {
      list = list.filter((t) => t.symbol.toUpperCase().includes(symbolFilter));
    }
    if (selectedTags.length > 0) {
      list = list.filter((t) =>
        selectedTags.every((tag) => Array.isArray(t.custom_tags) && t.custom_tags.includes(tag))
      );
    }
    return list;
  }, [trades, dateFrom, dateTo, direction, result, symbolFilter, selectedTags]);

  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const tag of selectedTags) {
      counts[tag] = trades.reduce(
        (acc, t) => acc + (Array.isArray(t.custom_tags) && t.custom_tags.includes(tag) ? 1 : 0),
        0
      );
    }
    return counts;
  }, [trades, selectedTags]);

  const toggleTag = (slug: string) => {
    setSelectedTags((prev) =>
      prev.includes(slug) ? prev.filter((t) => t !== slug) : [...prev, slug]
    );
    setPage(0);
  };

  const toggleCategory = (cat: TagCategory) => {
    const slugs = getSlugsByCategory(cat);
    const allSelected = slugs.every((s) => selectedTags.includes(s));
    setSelectedTags((prev) => {
      const without = prev.filter((t) => !slugs.includes(t));
      return allSelected ? without : [...without, ...slugs];
    });
    setPage(0);
  };

  const clearTags = () => {
    setSelectedTags([]);
    setPage(0);
  };

  // Summary stats
  const summary = useMemo(() => {
    const totalPnl = filtered.reduce((sum, t) => sum + getNetPnl(t), 0);
    const wins = filtered.filter((t) => getNetPnl(t) > 0).length;
    const winRate = filtered.length > 0 ? (wins / filtered.length) * 100 : 0;
    return { totalPnl, totalTrades: filtered.length, winRate };
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageTrades = useMemo(
    () => filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE),
    [filtered, currentPage]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">{tr("tradesTable.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ListFilter className="h-3.5 w-3.5" />
            {tr("tradesTable.filters")}
          </div>

          {/* Direction pills */}
          <div className="flex rounded-lg border border-border/40 bg-card shadow-sm overflow-hidden isolate" style={{ backgroundColor: "hsl(var(--card))" }}>
            {(["all", "buy", "sell"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => { setDirection(d); setPage(0); }}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium transition-colors",
                  direction === d
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                )}
              >
                {d === "all" ? tr("common.all") : d === "buy" ? tr("tradesTable.buy") : tr("tradesTable.sell")}
              </button>
            ))}
          </div>

          {/* Result pills */}
          <div className="flex rounded-lg border border-border/40 bg-card shadow-sm overflow-hidden isolate" style={{ backgroundColor: "hsl(var(--card))" }}>
            {(["all", "win", "loss"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => { setResult(r); setPage(0); }}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium transition-colors",
                  result === r
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                )}
              >
                {r === "all" ? tr("common.all") : r === "win" ? tr("tradesTable.win") : tr("tradesTable.loss")}
              </button>
            ))}
          </div>

          {/* Symbol search */}
          <input
            type="text"
            value={symbolFilter}
            onChange={(e) => { setSymbolFilter(e.target.value.toUpperCase()); setPage(0); }}
            placeholder={tr("tradesTable.searchSymbol")}
            className="rounded-xl border border-border/60 bg-transparent px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring w-28"
          />

          {/* Date filters */}
          <div className="flex items-center gap-2 ml-auto">
            <div className="flex items-center gap-1.5">
              <Label className="text-xs text-muted-foreground">{tr("common.from")}</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
                className="w-[130px] h-8 text-xs border-border/40"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Label className="text-xs text-muted-foreground">{tr("common.to")}</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
                className="w-[130px] h-8 text-xs border-border/40"
              />
            </div>
          </div>
        </div>

        {/* Tag filters */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/20">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
            <TagIcon className="h-3.5 w-3.5" /> {tr("tradeDetail.tags")}
          </div>

          {TAG_CATEGORY_ORDER.map((cat) => {
            const slugs = getSlugsByCategory(cat);
            const allSel = slugs.length > 0 && slugs.every((s) => selectedTags.includes(s));
            const styles = CATEGORY_BTN_STYLES[cat];
            return (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                  allSel ? styles.on : styles.off
                )}
              >
                {TAG_CATEGORY_LABELS[cat]}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setTagPanelOpen((v) => !v)}
            className="rounded-full border border-border/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:border-foreground/40 hover:text-foreground transition-colors"
          >
            {tagPanelOpen ? tr("tradesTable.closeTags") : tr("tradesTable.allTags")}
          </button>

          {selectedTags.length > 0 && (
            <button
              type="button"
              onClick={clearTags}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              {tr("common.clear")}
            </button>
          )}
        </div>

        {tagPanelOpen && (
          <div
            className="rounded-[22px] border border-border/40 p-3 space-y-3 isolate"
            style={{ backgroundColor: "hsl(var(--card))" }}
          >
            {TAG_CATEGORY_ORDER.map((cat) => {
              const tags = PREDEFINED_TAGS.filter((t) => t.category === cat);
              const styles = TAG_PILL_STYLES[cat];
              return (
                <div key={cat} className="space-y-1.5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-semibold">
                    {TAG_CATEGORY_LABELS[cat]}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => {
                      const isSel = selectedTags.includes(tag.slug);
                      return (
                        <button
                          key={tag.slug}
                          type="button"
                          onClick={() => toggleTag(tag.slug)}
                          title={tag.description}
                          className={cn(
                            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                            isSel ? styles.selected : styles.idle
                          )}
                        >
                          {tag.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {selectedTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {selectedTags.map((slug) => {
              const meta = getTagBySlug(slug);
              const label = meta?.label ?? slug;
              const count = tagCounts[slug] ?? 0;
              return (
                <span
                  key={slug}
                  className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px]"
                >
                  <span className="font-medium">{label}</span>
                  <span className="text-muted-foreground">· {count} {count !== 1 ? tr("tradesTable.tradesSuffixPlural") : tr("tradesTable.tradesSuffix")}</span>
                  <button
                    type="button"
                    onClick={() => toggleTag(slug)}
                    className="rounded-full p-0.5 hover:bg-muted"
                    aria-label={tr("tradesTable.removeFilterTag").replace("{label}", label)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}

        {/* Table */}
        <div className="rounded-input border border-border/40 shadow-sm overflow-x-auto">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow className="border-border/40 hover:bg-transparent">
                <TableHead className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{tr("tradesTable.colSymbol")}</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{tr("tradesTable.colDirection")}</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{tr("tradesTable.colOpen")}</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{tr("tradesTable.colClose")}</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground hidden lg:table-cell">{tr("tradesTable.colDuration")}</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground text-right hidden lg:table-cell">{tr("tradesTable.colGrossPnl")}</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground text-right hidden lg:table-cell">{tr("tradesTable.colFees")}</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground text-right">{tr("tradesTable.colNetPnl")}</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{tr("tradesTable.colResult")}</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground hidden xl:table-cell">{tr("tradesTable.colTags")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageTrades.map((t, idx) => {
                const gross = t.pnl_usd ?? 0;
                const fees = t.fees_usd ?? 0;
                const net = getNetPnl(t);
                const isWin = net > 0;
                const dirLower = (t.direction ?? "").toLowerCase();
                const isBuy = dirLower === "buy";
                return (
                  <TableRow
                    key={t.id}
                    className={cn(
                      "cursor-pointer transition-colors",
                      idx % 2 === 1 && "bg-muted/5",
                      !t.context && (!t.custom_tags || t.custom_tags.length === 0) && "border-l-2 border-l-amber-400/60"
                    )}
                    onClick={() => onTradeClick(t)}
                  >
                    <TableCell className="font-semibold text-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        {t.symbol}
                        {t.external_source === "metaapi" && (
                          <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 leading-none">
                            {tr("tradesTable.liveBadge")}
                          </span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={isBuy ? "default" : "warning"} className="capitalize">
                        {t.direction ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(t.opened_at)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(t.closed_at)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">
                      {formatDuration(t.opened_at, t.closed_at)}
                    </TableCell>
                    <TableCell className="text-right text-sm hidden lg:table-cell">
                      {mask(`${gross >= 0 ? "+" : ""}${gross.toFixed(2)}`)}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground hidden lg:table-cell">
                      {mask((fees ?? 0).toFixed(2))}
                    </TableCell>
                    <TableCell className={cn("text-right text-sm font-medium", net >= 0 ? "text-emerald-600 dark:text-emerald-500" : "text-red-600 dark:text-red-500")}>
                      {mask(`${net >= 0 ? "+" : ""}${net.toFixed(2)}`)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={isWin ? "success" : "destructive"}>
                        {isWin ? tr("tradesTable.win") : tr("tradesTable.loss")}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <div className="flex flex-wrap items-center gap-1">
                        {t.custom_tags && t.custom_tags.length > 0 && (
                          <>
                            {t.custom_tags.slice(0, 2).map((ctag: string) => {
                              const setupInfo = SETUP_TAGS[ctag];
                              const mistakeInfo = MISTAKE_TAGS[ctag];
                              const info = setupInfo || mistakeInfo;
                              return (
                                <span
                                  key={ctag}
                                  className={cn(
                                    "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                                    mistakeInfo
                                      ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                      : setupInfo
                                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                      : "bg-muted"
                                  )}
                                >
                                  {info?.emoji || ""} {info?.label || ctag}
                                </span>
                              );
                            })}
                            {t.custom_tags.length > 2 && (
                              <span className="text-[10px] text-muted-foreground">+{t.custom_tags.length - 2}</span>
                            )}
                          </>
                        )}
                        {t.context && (
                          <span title={tr("tradesTable.hasNotes")}><StickyNote className="h-3 w-3 text-muted-foreground/50" /></span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <TrendingUp className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              {tr("tradesTable.emptyTitle")}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {tr("tradesTable.emptyHint")}
            </p>
          </div>
        )}

        {/* Summary footer + pagination */}
        {filtered.length > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            {/* Summary */}
            <div className="flex items-center gap-4 text-xs">
              <span className="text-muted-foreground">
                {summary.totalTrades} {summary.totalTrades !== 1 ? tr("tradesTable.tradesSuffixPlural") : tr("tradesTable.tradesSuffix")}
              </span>
              <span className={cn(
                "font-semibold",
                summary.totalPnl >= 0 ? "text-emerald-600 dark:text-emerald-500" : "text-red-600 dark:text-red-500"
              )}>
                {mask(`${summary.totalPnl >= 0 ? "+" : ""}${summary.totalPnl.toFixed(2)} USD`)}
              </span>
              <span className="text-muted-foreground">
                {tr("tradesTable.winRate").replace("{rate}", summary.winRate.toFixed(0))}
              </span>
            </div>

            {/* Pagination */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {currentPage + 1}/{totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="h-7 text-xs"
              >
                {tr("common.previous")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                className="h-7 text-xs"
              >
                {tr("common.next")}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
