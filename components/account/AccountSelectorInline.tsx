"use client";

import { useMemo, useState, useCallback } from "react";
import { ChevronDown, Plus, Briefcase, Wallet, Bitcoin, Settings, FlaskConical, Pencil, Check, X } from "lucide-react";
import { motion } from "framer-motion";
import { useActiveAccount } from "@/components/context/ActiveAccountContext";
import { useLiveMonitoringSafe } from "@/components/context/LiveMonitoringContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { AddAccountModal } from "@/components/account/AddAccountModal";
import { ManageAccountsModal } from "@/components/account/ManageAccountsModal";
import { supabase } from "@/lib/supabase/client";
import type { AccountWithProp } from "@/lib/accounts";

function getAccountIcon(account: AccountWithProp) {
  if (account.kind === "crypto") return Bitcoin;
  if (account.kind === "personal") return Wallet;
  if (account.kind === "backtest") return FlaskConical;
  return Briefcase;
}

function getKindLabel(kind: string) {
  if (kind === "prop") return "Mesa Proprietária";
  if (kind === "personal") return "Capital Pessoal";
  if (kind === "crypto") return "Crypto";
  if (kind === "backtest") return "Backtest";
  return kind;
}

interface AccountSelectorInlineProps {
  showAddButton?: boolean;
}

export function AccountSelectorInline({ showAddButton = false }: AccountSelectorInlineProps) {
  const { accounts, activeAccountId, setActiveAccountId, refreshAccounts } = useActiveAccount();
  const liveMonitoring = useLiveMonitoringSafe();
  const isLiveConnected = liveMonitoring?.isConnected && liveMonitoring?.connectionStatus === "connected";
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const sortedAccounts = useMemo(() => {
    return accounts.filter((a) => a.is_active);
  }, [accounts]);

  const active = sortedAccounts.find((a) => a.id === activeAccountId) ?? sortedAccounts[0];

  const handleRename = useCallback(async (accountId: string) => {
    const trimmed = editName.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }
    try {
      const { error } = await supabase
        .from("accounts")
        .update({ name: trimmed })
        .eq("id", accountId);
      if (!error) {
        await refreshAccounts();
      }
    } catch {
      // ignore
    }
    setEditingId(null);
  }, [editName, refreshAccounts]);

  const startEditing = useCallback((account: AccountWithProp, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(account.id);
    setEditName(account.name);
  }, []);

  if (!active && !showAddButton) return null;

  return (
    <>
      <div className="flex items-center gap-2">
        <DropdownMenu open={dropdownOpen} onOpenChange={(open) => {
          setDropdownOpen(open);
          if (!open) setEditingId(null);
        }}>
          <DropdownMenuTrigger
            className="inline-flex h-11 items-center gap-2 rounded-full border border-border/80 px-4 text-sm font-medium shadow-sm transition-all duration-200 hover:border-border hover:shadow-md"
            style={{ backgroundColor: "hsl(var(--card))" }}
          >
            {active ? (
              <>
                {(() => { const Icon = getAccountIcon(active); return <Icon className="h-4 w-4 shrink-0 opacity-60" />; })()}
                <span className="truncate max-w-[260px]">{active.name}</span>
                {isLiveConnected && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 shrink-0">
                    <motion.span
                      className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                    Ao vivo
                  </span>
                )}
                <ChevronDown className="h-4 w-4 opacity-60 shrink-0" />
              </>
            ) : (
              <>
                <Wallet className="h-4 w-4 opacity-60 shrink-0" />
                <span className="text-muted-foreground">Selecionar conta</span>
                <ChevronDown className="h-4 w-4 opacity-60 shrink-0" />
              </>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[360px]">
            {(["prop", "personal", "crypto", "backtest"] as const).map((kind) => {
              const kindAccounts = sortedAccounts.filter((a) => a.kind === kind);
              if (kindAccounts.length === 0) return null;
              return (
                <div key={kind}>
                  <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {getKindLabel(kind)}
                  </div>
                  {kindAccounts.map((account) => {
                    const Icon = getAccountIcon(account);
                    const isActive = account.id === activeAccountId;
                    const isEditing = editingId === account.id;

                    if (isEditing) {
                      return (
                        <div key={account.id} className="flex items-center gap-2 px-2 py-1.5">
                          <Icon className="h-4 w-4 shrink-0 opacity-60" />
                          <input
                            autoFocus
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleRename(account.id);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            className="flex-1 rounded-md border border-border bg-transparent px-2 py-0.5 text-sm font-medium outline-none focus:border-blue-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleRename(account.id); }}
                            className="rounded-full p-1 text-muted-foreground hover:text-emerald-500"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setEditingId(null); }}
                            className="rounded-full p-1 text-muted-foreground hover:text-foreground"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    }

                    return (
                      <DropdownMenuItem
                        key={account.id}
                        onClick={() => setActiveAccountId(account.id)}
                        className={cn("cursor-pointer gap-2 group", isActive && "bg-muted")}
                      >
                        <Icon className="h-4 w-4 shrink-0 opacity-60" />
                        <span className="truncate flex-1">{account.name}</span>
                        <button
                          type="button"
                          onClick={(e) => startEditing(account, e)}
                          className="rounded-full p-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
                          title="Renomear"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      </DropdownMenuItem>
                    );
                  })}
                  <DropdownMenuSeparator />
                </div>
              );
            })}
            <DropdownMenuItem
              onClick={() => setManageModalOpen(true)}
              className="cursor-pointer gap-2"
            >
              <Settings className="h-4 w-4 shrink-0 opacity-60" />
              <span>Gerenciar contas</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {showAddButton && (
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-dashed border-border/80 text-muted-foreground transition-all duration-200 hover:border-blue-500 hover:text-blue-500 hover:shadow-md"
            style={{ backgroundColor: "hsl(var(--card))" }}
            title="Adicionar conta"
          >
            <Plus className="h-5 w-5" />
          </button>
        )}
      </div>

      <AddAccountModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onAccountCreated={(id) => setActiveAccountId(id)}
        onRefreshAccounts={refreshAccounts}
      />

      <ManageAccountsModal
        open={manageModalOpen}
        onOpenChange={setManageModalOpen}
      />
    </>
  );
}
