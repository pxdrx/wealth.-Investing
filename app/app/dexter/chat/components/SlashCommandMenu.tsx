"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, Hash, MessageSquareHeart, RefreshCw, Search, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppT } from "@/hooks/useAppLocale";
import type { AppMessageKey } from "@/lib/i18n/app";

export type SlashCommandId = "coach" | "analyst" | "trade" | "mood" | "reset";

export interface SlashCommand {
  id: SlashCommandId;
  name: string;
  description: string;
  descriptionKey?: AppMessageKey;
  icon: LucideIcon;
  takesArg?: boolean;
}

const COMMANDS: readonly SlashCommand[] = [
  { id: "coach",   name: "coach",   description: "Abrir reflexão profunda no Coach",         descriptionKey: "dexter.chat.cmd.coach",   icon: BarChart3 },
  { id: "analyst", name: "analyst", description: "Pesquisar um ticker no Analyst",            descriptionKey: "dexter.chat.cmd.analyst", icon: Search, takesArg: true },
  { id: "trade",   name: "trade",   description: "Registrar um novo trade",                   descriptionKey: "dexter.chat.cmd.trade",   icon: TrendingUp },
  { id: "mood",    name: "mood",    description: "Ticker avalia seu mood atual",              descriptionKey: "dexter.chat.cmd.mood",    icon: MessageSquareHeart },
  { id: "reset",   name: "reset",   description: "Limpar esta conversa",                      descriptionKey: "dexter.chat.cmd.reset",   icon: RefreshCw },
];

export interface SlashCommandMenuProps {
  query: string;
  onSelect: (cmd: SlashCommand, arg?: string) => void;
  onClose: () => void;
}

export function SlashCommandMenu({ query, onSelect, onClose }: SlashCommandMenuProps) {
  const t = useAppT();
  const { prefix, arg } = useMemo(() => {
    const raw = query.replace(/^\//, "").trimStart();
    const [first, ...rest] = raw.split(/\s+/);
    return { prefix: (first ?? "").toLowerCase(), arg: rest.join(" ").trim() };
  }, [query]);

  const filtered = useMemo(() => {
    if (!prefix) return COMMANDS;
    return COMMANDS.filter((c) => c.name.startsWith(prefix));
  }, [prefix]);

  const [activeIdx, setActiveIdx] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveIdx(0);
  }, [prefix]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => (filtered.length === 0 ? 0 : (i + 1) % filtered.length));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => (filtered.length === 0 ? 0 : (i - 1 + filtered.length) % filtered.length));
      } else if (e.key === "Enter") {
        const cmd = filtered[activeIdx];
        if (!cmd) return;
        e.preventDefault();
        onSelect(cmd, cmd.takesArg ? arg || undefined : undefined);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [filtered, activeIdx, arg, onSelect, onClose]);

  if (filtered.length === 0) {
    return (
      <div
        className="absolute bottom-full left-0 right-0 mb-2 rounded-[20px] border border-border/60 p-3 shadow-soft dark:shadow-soft-dark"
        style={{ backgroundColor: "hsl(var(--card))" }}
      >
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Hash className="h-3.5 w-3.5" />
          {t("dexter.chat.menu.empty")} <span className="font-medium text-foreground">/{prefix}</span>
        </p>
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      role="listbox"
      className="absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-[20px] border border-border/60 shadow-soft dark:shadow-soft-dark"
      style={{ backgroundColor: "hsl(var(--card))" }}
    >
      <div className="flex items-center justify-between border-b border-border/40 px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        <span>{t("dexter.chat.menu.title")}</span>
        <span>{t("dexter.chat.menu.hint")}</span>
      </div>
      <div className="max-h-[260px] overflow-y-auto">
        {filtered.map((cmd, idx) => {
          const Icon = cmd.icon;
          const active = idx === activeIdx;
          return (
            <button
              key={cmd.id}
              type="button"
              role="option"
              aria-selected={active}
              onMouseEnter={() => setActiveIdx(idx)}
              onClick={() => onSelect(cmd, cmd.takesArg ? arg || undefined : undefined)}
              className={cn(
                "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
                active ? "bg-emerald-500/10" : "hover:bg-muted/30",
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                  active ? "bg-emerald-500/20 text-emerald-300" : "bg-muted/40 text-muted-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  /{cmd.name}
                  {cmd.takesArg && (
                    <span className="ml-1 font-normal text-muted-foreground">&lt;arg&gt;</span>
                  )}
                </p>
                <p className="truncate text-xs text-muted-foreground">{cmd.descriptionKey ? t(cmd.descriptionKey) : cmd.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { COMMANDS as SLASH_COMMANDS };
