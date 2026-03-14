"use client";

import { useState } from "react";
import { Briefcase, Wallet, Bitcoin, Trash2 } from "lucide-react";
import { useActiveAccount } from "@/components/context/ActiveAccountContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase/client";
import type { AccountWithProp, AccountKind } from "@/lib/accounts";

interface ManageAccountsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getKindIcon(kind: AccountKind) {
  if (kind === "crypto") return Bitcoin;
  if (kind === "personal") return Wallet;
  return Briefcase;
}

function getKindLabel(kind: AccountKind) {
  if (kind === "prop") return "Mesa Proprietaria";
  if (kind === "personal") return "Capital Pessoal";
  if (kind === "crypto") return "Crypto";
  return kind;
}

function formatAccountName(account: AccountWithProp) {
  if (account.kind === "prop" && account.prop) {
    const firm = account.prop.firm_name ?? account.name;
    const balance = Number(account.prop.starting_balance_usd ?? 0);
    const phase =
      account.prop.phase === "phase_1"
        ? "Phase 1"
        : account.prop.phase === "phase_2"
          ? "Phase 2"
          : account.prop.phase === "funded"
            ? "Funded"
            : "";
    const balanceLabel =
      balance > 0
        ? `$${balance.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
        : "";
    return [firm, balanceLabel, phase].filter(Boolean).join(" \u2014 ");
  }
  return account.name;
}

export function ManageAccountsModal({
  open,
  onOpenChange,
}: ManageAccountsModalProps) {
  const { accounts, refreshAccounts } = useActiveAccount();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const groupedKinds: AccountKind[] = ["prop", "personal", "crypto"];

  async function handleDelete(account: AccountWithProp) {
    setDeletingId(account.id);
    setError(null);

    try {
      // Delete prop_accounts row first if prop kind
      if (account.kind === "prop") {
        const { error: propErr } = await supabase
          .from("prop_accounts")
          .delete()
          .eq("account_id", account.id);

        if (propErr) {
          setError(`Erro ao excluir dados prop: ${propErr.message}`);
          setDeletingId(null);
          return;
        }
      }

      // Delete the account itself
      const { error: accErr } = await supabase
        .from("accounts")
        .delete()
        .eq("id", account.id);

      if (accErr) {
        setError(`Erro ao excluir conta: ${accErr.message}`);
        setDeletingId(null);
        return;
      }

      setConfirmingId(null);
      await refreshAccounts();
    } catch {
      setError("Erro inesperado ao excluir conta.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Gerenciar contas</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {accounts.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma conta encontrada
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {groupedKinds.map((kind) => {
              const kindAccounts = accounts.filter((a) => a.kind === kind);
              if (kindAccounts.length === 0) return null;

              return (
                <div key={kind}>
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {getKindLabel(kind)}
                  </div>
                  <div className="flex flex-col gap-2">
                    {kindAccounts.map((account) => {
                      const Icon = getKindIcon(account.kind);
                      const isConfirming = confirmingId === account.id;
                      const isDeleting = deletingId === account.id;

                      return (
                        <div
                          key={account.id}
                          className="flex items-center justify-between rounded-[22px] border border-border/60 px-4 py-3"
                          style={{
                            backgroundColor: "hsl(var(--card))",
                          }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Icon className="h-4 w-4 shrink-0 opacity-60" />
                            <span className="truncate text-sm font-medium">
                              {formatAccountName(account)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 ml-3">
                            {isConfirming ? (
                              <>
                                <button
                                  type="button"
                                  disabled={isDeleting}
                                  onClick={() => handleDelete(account)}
                                  className="rounded-full bg-destructive px-3 py-1 text-xs font-medium text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                                >
                                  {isDeleting ? "Excluindo..." : "Confirmar"}
                                </button>
                                <button
                                  type="button"
                                  disabled={isDeleting}
                                  onClick={() => setConfirmingId(null)}
                                  className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                                >
                                  Cancelar
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setConfirmingId(account.id);
                                  setError(null);
                                }}
                                className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                title="Excluir conta"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
