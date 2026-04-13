"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Loader2, ShieldAlert, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminUser {
  id: string;
  displayName: string | null;
  email: string | null;
  plan: string | null;
  status: string | null;
  isAdmin: boolean;
  createdAt: string | null;
}

type PlanKey = "free" | "pro" | "ultra" | "mentor";

const PLAN_OPTIONS: PlanKey[] = ["free", "pro", "ultra", "mentor"];

const PLAN_BADGE_STYLES: Record<PlanKey, string> = {
  free: "bg-zinc-500/10 text-zinc-500",
  pro: "bg-blue-500/10 text-blue-500",
  ultra: "bg-purple-500/10 text-purple-500",
  mentor: "bg-amber-500/10 text-amber-600",
};

const PLAN_LABELS: Record<PlanKey, string> = {
  free: "Free",
  pro: "Pro",
  ultra: "Ultra",
  mentor: "Mentor",
};

async function apiFetch(path: string, options?: RequestInit) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Sessao expirada");
  const res = await fetch(path, {
    ...options,
    headers: {
      ...options?.headers,
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
  });
  const json = await res.json();
  if (!res.ok || !json.ok) throw new Error(json.error ?? "Erro desconhecido");
  return json;
}

function PlanBadge({ plan }: { plan: string }) {
  const key = (PLAN_OPTIONS.includes(plan as PlanKey) ? plan : "free") as PlanKey;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        PLAN_BADGE_STYLES[key]
      )}
    >
      {PLAN_LABELS[key]}
    </span>
  );
}

function abbreviateId(id: string): string {
  if (!id || id.length < 8) return id || "—";
  return `${id.slice(0, 4)}...${id.slice(-4)}`;
}

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ userId: string; type: "success" | "error"; message: string } | null>(null);

  // Check admin status then load users
  useEffect(() => {
    let cancelled = false;
    const safety = setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 8000);

    async function init() {
      try {
        const meRes = await apiFetch("/api/admin/me");
        if (cancelled) return;
        if (!meRes.isAdmin) {
          setIsAdmin(false);
          setLoading(false);
          return;
        }
        setIsAdmin(true);

        const usersRes = await apiFetch("/api/admin/users");
        if (cancelled) return;
        setUsers(usersRes.users ?? []);
      } catch {
        if (!cancelled) setIsAdmin(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
      clearTimeout(safety);
    };
  }, []);

  const handlePlanChange = useCallback(async (userId: string, newPlan: string) => {
    setPromotingId(userId);
    setFeedback(null);

    // Optimistic update
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, plan: newPlan } : u))
    );

    try {
      const res = await apiFetch("/api/admin/promote", {
        method: "POST",
        body: JSON.stringify({ userId, plan: newPlan }),
      });
      setFeedback({ userId, type: "success", message: `Plano alterado para ${PLAN_LABELS[res.plan as PlanKey] ?? res.plan}` });
    } catch (err: unknown) {
      // Revert optimistic update — refetch
      try {
        const usersRes = await apiFetch("/api/admin/users");
        setUsers(usersRes.users ?? []);
      } catch {
        // keep current state
      }
      const message = err instanceof Error ? err.message : "Erro ao alterar plano";
      setFeedback({ userId, type: "error", message });
    } finally {
      setPromotingId(null);
      // Auto-clear feedback after 4s
      setTimeout(() => setFeedback(null), 4000);
    }
  }, []);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.displayName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q)
    );
  }, [users, search]);

  // Loading state
  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Access denied
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
          <ShieldAlert className="h-12 w-12 text-destructive/60" />
          <h1 className="text-xl font-semibold tracking-tight">Acesso negado</h1>
          <p className="text-sm text-muted-foreground max-w-md">
            Apenas administradores podem acessar esta pagina.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Painel Admin</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie usuarios e planos
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, email ou ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 rounded-full"
        />
      </div>

      {/* Users Table */}
      <Card
        className="rounded-[22px] overflow-hidden border"
        style={{ backgroundColor: "hsl(var(--card))" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="px-4 py-3 font-medium text-muted-foreground">Nome</th>
                <th className="px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Email</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Plano Atual</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    Nenhum usuario encontrado
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">{user.displayName || "Sem nome"}</div>
                      <div className="text-xs text-muted-foreground sm:hidden mt-0.5">
                        {user.email ?? "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                      {user.email ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <PlanBadge plan={user.plan ?? "free"} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <select
                          value={user.plan ?? "free"}
                          onChange={(e) => handlePlanChange(user.id, e.target.value)}
                          disabled={promotingId === user.id}
                          className={cn(
                            "rounded-full border bg-transparent px-3 py-1.5 text-xs font-medium transition-colors",
                            "focus:outline-none focus:ring-2 focus:ring-primary/30",
                            "disabled:opacity-50 disabled:cursor-not-allowed"
                          )}
                        >
                          {PLAN_OPTIONS.map((p) => (
                            <option key={p} value={p}>
                              {PLAN_LABELS[p]}
                            </option>
                          ))}
                        </select>
                        {promotingId === user.id && (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                        )}
                        {feedback?.userId === user.id && (
                          <span
                            className={cn(
                              "text-xs font-medium",
                              feedback.type === "success"
                                ? "text-emerald-500"
                                : "text-destructive"
                            )}
                          >
                            {feedback.message}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* User count */}
      {users.length > 0 && (
        <p className="text-xs text-muted-foreground mt-4">
          {filteredUsers.length} de {users.length} usuarios
        </p>
      )}
    </div>
  );
}
