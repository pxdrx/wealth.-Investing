"use client";

import { useState } from "react";
import { Briefcase, Wallet, Bitcoin, FlaskConical, Trash2, Pencil, Check, X, SlidersHorizontal } from "lucide-react";
import { useActiveAccount } from "@/components/context/ActiveAccountContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase/client";
import type { AccountWithProp, AccountKind } from "@/lib/accounts";
import { EditAccountRulesDrawer } from "@/components/account/EditAccountRulesDrawer";

interface ManageAccountsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getKindIcon(kind: AccountKind) {
  if (kind === "crypto") return Bitcoin;
  if (kind === "personal") return Wallet;
  if (kind === "backtest") return FlaskConical;
  return Briefcase;
}

function getKindLabel(kind: AccountKind) {
  if (kind === "prop") return "Mesa Proprietaria";
  if (kind === "personal") return "Capital Pessoal";
  if (kind === "crypto") return "Crypto";
  if (kind === "backtest") return "Backtest";
  return kind;
}

function formatAccountName(account: AccountWithProp) {
  return account.name;
}

export function ManageAccountsModal({
  open,
  onOpenChange,
}: ManageAccountsModalProps) {
  const { accounts, refreshAccounts } = useActiveAccount();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [rulesEditingAccount, setRulesEditingAccount] = useState<AccountWithProp | null>(null);
  const [error, setError] = useState<string | null>(null);

  const groupedKinds: AccountKind[] = ["prop", "personal", "crypto", "backtest"];

  async function handleDelete(account: AccountWithProp) {
    setDeletingId(account.id);
    setError(null);

    try {
      // SEC-024: Get user_id for defense-in-depth filtering
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) {
        setError("Sessao expirada. Faca login novamente.");
        setDeletingId(null);
        return;
      }

      // Delete prop_accounts row first if prop kind
      if (account.kind === "prop") {
        const { error: propErr } = await supabase
          .from("prop_accounts")
          .delete()
          .eq("account_id", account.id)
          .eq("user_id", userId);

        if (propErr) {
          setError("Erro ao excluir dados prop.");
          setDeletingId(null);
          return;
        }
      }

      // Delete all trades for this account (required before deleting the account)
      const { error: tradesErr } = await supabase
        .from("journal_trades")
        .delete()
        .eq("account_id", account.id)
        .eq("user_id", userId);

      if (tradesErr) {
        setError("Erro ao excluir trades da conta.");
        setDeletingId(null);
        return;
      }

      // Delete the account itself
      const { error: accErr } = await supabase
        .from("accounts")
        .delete()
        .eq("id", account.id)
        .eq("user_id", userId);

      if (accErr) {
        setError("Erro ao excluir conta.");
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

  async function handleRename(accountId: string) {
    const trimmed = editName.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from("accounts")
        .update({ name: trimmed })
        .eq("id", accountId);
      if (updateError) throw updateError;
      setEditingId(null);
      await refreshAccounts();
    } catch {
      setError("Erro ao renomear conta.");
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
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <Icon className="h-4 w-4 shrink-0 opacity-60" />
                            {editingId === account.id ? (
                              <input
                                autoFocus
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleRename(account.id);
                                  if (e.key === "Escape") setEditingId(null);
                                }}
                                onBlur={() => handleRename(account.id)}
                                className="flex-1 rounded-md border border-border bg-transparent px-2 py-0.5 text-sm font-medium outline-none focus:border-blue-500"
                              />
                            ) : (
                              <span className="truncate text-sm font-medium">
                                {formatAccountName(account)}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0 ml-3">
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
                            ) : editingId === account.id ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleRename(account.id)}
                                  className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-emerald-500/10 hover:text-emerald-500"
                                  title="Salvar"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingId(null)}
                                  className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted"
                                  title="Cancelar"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingId(account.id);
                                    setEditName(account.name);
                                    setConfirmingId(null);
                                    setError(null);
                                  }}
                                  className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                  title="Renomear conta"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                {account.kind === "prop" && account.prop && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRulesEditingAccount(account);
                                      setConfirmingId(null);
                                      setEditingId(null);
                                      setError(null);
                                    }}
                                    className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                    title="Editar regras da mesa"
                                  >
                                    <SlidersHorizontal className="h-3.5 w-3.5" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setConfirmingId(account.id);
                                    setEditingId(null);
                                    setError(null);
                                  }}
                                  className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                  title="Excluir conta"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
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
      {rulesEditingAccount?.prop && (
        <EditAccountRulesDrawer
          open={!!rulesEditingAccount}
          onOpenChange={(v) => {
            if (!v) setRulesEditingAccount(null);
          }}
          accountId={rulesEditingAccount.id}
          accountName={rulesEditingAccount.name}
          prop={rulesEditingAccount.prop}
          onSaved={async () => {
            await refreshAccounts();
          }}
        />
      )}
    </Dialog>
  );
}
