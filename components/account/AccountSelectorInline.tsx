"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Plus, Briefcase, Wallet, Bitcoin } from "lucide-react";
import { useActiveAccount } from "@/components/context/ActiveAccountContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { AddAccountModal } from "@/components/account/AddAccountModal";
import type { AccountWithProp } from "@/lib/accounts";

function getAccountIcon(account: AccountWithProp) {
  if (account.kind === "crypto") return Bitcoin;
  if (account.kind === "personal") return Wallet;
  return Briefcase;
}

function formatAccountLabel(account: AccountWithProp) {
  if (account.kind === "prop" && account.prop) {
    const firm = account.prop.firm_name ?? account.name;
    const balance = Number(account.prop.starting_balance_usd ?? 0);
    const phase =
      account.prop.phase === "phase_1" ? "Phase 1"
      : account.prop.phase === "phase_2" ? "Phase 2"
      : account.prop.phase === "funded" ? "Funded"
      : "";
    const balanceLabel = balance > 0
      ? `$${balance.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
      : "";
    return [firm, balanceLabel, phase].filter(Boolean).join(" — ");
  }
  return account.name;
}

function getKindLabel(kind: string) {
  if (kind === "prop") return "Mesa Proprietária";
  if (kind === "personal") return "Capital Pessoal";
  if (kind === "crypto") return "Crypto";
  return kind;
}

interface AccountSelectorInlineProps {
  showAddButton?: boolean;
}

export function AccountSelectorInline({ showAddButton = false }: AccountSelectorInlineProps) {
  const { accounts, activeAccountId, setActiveAccountId, refreshAccounts } = useActiveAccount();
  const [addModalOpen, setAddModalOpen] = useState(false);

  const sortedAccounts = useMemo(() => {
    return accounts.filter((a) => a.is_active);
  }, [accounts]);

  const active = sortedAccounts.find((a) => a.id === activeAccountId) ?? sortedAccounts[0];

  if (!active && !showAddButton) return null;

  return (
    <>
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex h-11 items-center gap-2 rounded-full border border-border/80 px-4 text-sm font-medium shadow-sm transition-all duration-200 hover:border-border hover:shadow-md"
            style={{ backgroundColor: "hsl(var(--card))" }}
          >
            {active ? (
              <>
                {(() => { const Icon = getAccountIcon(active); return <Icon className="h-4 w-4 shrink-0 opacity-60" />; })()}
                <span className="truncate max-w-[260px]">{formatAccountLabel(active)}</span>
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
          <DropdownMenuContent align="end" className="w-[340px]">
            {/* Group by kind */}
            {(["prop", "personal", "crypto"] as const).map((kind) => {
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
                    return (
                      <DropdownMenuItem
                        key={account.id}
                        onClick={() => setActiveAccountId(account.id)}
                        className={cn("cursor-pointer gap-2", isActive && "bg-muted")}
                      >
                        <Icon className="h-4 w-4 shrink-0 opacity-60" />
                        <span className="truncate">{formatAccountLabel(account)}</span>
                      </DropdownMenuItem>
                    );
                  })}
                  <DropdownMenuSeparator />
                </div>
              );
            })}
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
    </>
  );
}
