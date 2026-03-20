"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSubscription } from "@/components/context/SubscriptionContext";
import { SubscriptionBadge } from "@/components/billing/SubscriptionBadge";
import { ThemeToggle } from "@/components/theme-toggle";
import { supabase } from "@/lib/supabase/client";
import { getMyProfile, upsertMyProfileDisplayName } from "@/lib/profile";
import {
  Loader2,
  Save,
  ExternalLink,
  AlertTriangle,
  Trash2,
  X,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  LayoutDashboard,
} from "lucide-react";
import Link from "next/link";
import {
  DEFAULT_LAYOUT,
  WIDGET_LABELS,
  mergeLayout,
  type DashboardLayout,
} from "@/components/dashboard/WidgetRenderer";

export default function SettingsPage() {
  // ── Profile state ──
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // ── Subscription ──
  const { plan, status, subscription, isLoading: subLoading } =
    useSubscription();

  // ── Portal loading ──
  const [portalLoading, setPortalLoading] = useState(false);

  // ── Delete modal ──
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  // ── Dashboard layout ──
  const [dashLayout, setDashLayout] = useState<DashboardLayout>(DEFAULT_LAYOUT);
  const [dashLayoutLoaded, setDashLayoutLoaded] = useState(false);
  const [dashSaving, setDashSaving] = useState(false);
  const [dashMsg, setDashMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ── Load profile + email ──
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [profile, { data: { session } }] = await Promise.all([
          getMyProfile(),
          supabase.auth.getSession(),
        ]);
        if (!mounted) return;
        if (profile) {
          setDisplayName(profile.display_name ?? "");
        }
        if (session?.user?.email) setEmail(session.user.email);

        // Load dashboard layout: DB first, then localStorage fallback
        // This mirrors the exact same logic used in app/app/page.tsx (Dashboard)
        let layoutLoaded = false;
        if (session?.user?.id) {
          try {
            const { data: layoutProfile } = await supabase
              .from("profiles")
              .select("dashboard_layout")
              .eq("id", session.user.id)
              .maybeSingle();
            if (!mounted) return;
            if (layoutProfile?.dashboard_layout) {
              setDashLayout(mergeLayout(layoutProfile.dashboard_layout as DashboardLayout));
              layoutLoaded = true;
            }
          } catch {}
          if (!layoutLoaded && !mounted) return;
          if (!layoutLoaded) {
            try {
              const stored = localStorage.getItem(`wealth-dash-layout-${session.user.id}`);
              if (stored) {
                setDashLayout(mergeLayout(JSON.parse(stored)));
                layoutLoaded = true;
              }
            } catch {}
          }
        }
        if (mounted) setDashLayoutLoaded(true);
      } catch (err) {
        console.error("[settings] failed to load profile:", err);
      } finally {
        if (mounted) setProfileLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  // ── Save profile ──
  const handleSaveProfile = useCallback(async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const { error } = await upsertMyProfileDisplayName(displayName);
      if (error) {
        setSaveMsg({ type: "error", text: error.message });
      } else {
        setSaveMsg({ type: "success", text: "Perfil salvo com sucesso!" });
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Erro ao salvar perfil";
      setSaveMsg({ type: "error", text: msg });
    } finally {
      setSaving(false);
    }
  }, [displayName]);

  // ── Open Stripe portal ──
  const openPortal = useCallback(async () => {
    setPortalLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada");

      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });
      const json = await res.json();
      if (!res.ok || !json.url) {
        throw new Error(json.error === "No subscription found"
          ? "Nenhuma assinatura encontrada para gerenciar."
          : json.error ?? "Erro ao abrir portal de pagamentos");
      }
      // Clear loading BEFORE redirect
      setPortalLoading(false);
      window.location.href = json.url;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao abrir portal";
      setSaveMsg({ type: "error", text: msg });
      setPortalLoading(false);
    }
  }, []);

  // ── Format date ──
  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  // ── Dashboard layout helpers ──
  const toggleWidget = useCallback((id: string) => {
    setDashLayout((prev) => ({
      ...prev,
      widgets: prev.widgets.map((w) =>
        w.id === id ? { ...w, visible: !w.visible } : w
      ),
    }));
  }, []);

  const moveWidget = useCallback((id: string, direction: "up" | "down") => {
    setDashLayout((prev) => {
      const widgets = [...prev.widgets].sort((a, b) => a.order - b.order);
      const idx = widgets.findIndex((w) => w.id === id);
      if (idx === -1) return prev;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= widgets.length) return prev;

      const tempOrder = widgets[idx].order;
      widgets[idx] = { ...widgets[idx], order: widgets[swapIdx].order };
      widgets[swapIdx] = { ...widgets[swapIdx], order: tempOrder };

      return { ...prev, widgets };
    });
  }, []);

  const handleSaveDashLayout = useCallback(async () => {
    setDashSaving(true);
    setDashMsg(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada");

      // Always save to localStorage as reliable fallback
      const storageKey = `wealth-dash-layout-${session.user.id}`;
      try { localStorage.setItem(storageKey, JSON.stringify(dashLayout)); } catch {}

      // Try saving to DB
      const { error } = await supabase
        .from("profiles")
        .update({ dashboard_layout: dashLayout as unknown as Record<string, unknown> })
        .eq("id", session.user.id);
      if (error) {
        console.error("[settings] dashboard_layout save error:", error);
        // If column doesn't exist, localStorage is enough
        if (error.message?.includes("dashboard_layout") || error.code === "42703") {
          setDashMsg({ type: "success", text: "Layout salvo localmente!" });
          return;
        }
        throw error;
      }
      setDashMsg({ type: "success", text: "Layout salvo com sucesso!" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar layout";
      console.error("[settings] save layout:", err);
      setDashMsg({ type: "error", text: msg });
    } finally {
      setDashSaving(false);
    }
  }, [dashLayout]);

  const resetDashLayout = useCallback(() => {
    setDashLayout(DEFAULT_LAYOUT);
  }, []);

  const cardStyle = { backgroundColor: "hsl(var(--card))" };

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Gerencie seu perfil, assinatura e preferências.
      </p>

      <div className="mt-8 space-y-6">
        {/* ═══════════ 1. Perfil ═══════════ */}
        <Card className="rounded-[22px] p-6" style={cardStyle}>
          <h2 className="text-lg font-semibold">Perfil</h2>

          {profileLoading ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando...
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="grid gap-1.5">
                <Label htmlFor="displayName">Nome de exibição</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Seu nome"
                  className="max-w-sm"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  value={email}
                  readOnly
                  disabled
                  className="max-w-sm"
                />
              </div>

              <div className="flex items-center gap-3">
                <Button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="rounded-full"
                >
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Salvar
                </Button>

                {saveMsg && (
                  <span
                    className={
                      saveMsg.type === "success"
                        ? "text-sm text-green-600"
                        : "text-sm text-red-500"
                    }
                  >
                    {saveMsg.text}
                  </span>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* ═══════════ 2. Assinatura ═══════════ */}
        <Card className="rounded-[22px] p-6" style={cardStyle}>
          <h2 className="text-lg font-semibold">Assinatura</h2>

          {subLoading ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando...
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  Plano atual:
                </span>
                <SubscriptionBadge />
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Status:</span>
                <span className="text-sm font-medium capitalize">
                  {status}
                </span>
              </div>

              {subscription?.current_period_end && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    Renova em:
                  </span>
                  <span className="text-sm font-medium">
                    {formatDate(subscription.current_period_end)}
                  </span>
                </div>
              )}

              <div className="flex flex-wrap gap-3 pt-2">
                {plan !== "free" && (
                  <Button
                    variant="outline"
                    className="rounded-full"
                    onClick={openPortal}
                    disabled={portalLoading}
                  >
                    {portalLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ExternalLink className="mr-2 h-4 w-4" />
                    )}
                    Gerenciar assinatura
                  </Button>
                )}

                {plan === "free" && (
                  <Button asChild className="rounded-full">
                    <Link href="/app/pricing">Fazer upgrade</Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* ═══════════ 3. Preferências ═══════════ */}
        <Card className="rounded-[22px] p-6" style={cardStyle}>
          <h2 className="text-lg font-semibold">Preferências</h2>

          <div className="mt-4 flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Tema:</span>
            <ThemeToggle />
          </div>
        </Card>

        {/* ═══════════ 4. Dashboard ═══════════ */}
        <Card className="rounded-[22px] p-6" style={cardStyle}>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <LayoutDashboard className="h-5 w-5 text-muted-foreground" />
            Dashboard
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Marque os widgets que deseja exibir e use as setas para reordenar.
          </p>

          {/* Column headers */}
          <div className="mt-4 flex items-center gap-3 px-3 pb-1">
            <span className="w-4" />
            <span className="flex-1 text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Widget</span>
            <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Plano</span>
            <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground w-16 text-center">Ordem</span>
          </div>

          <div className="space-y-1">
            {[...dashLayout.widgets]
              .sort((a, b) => a.order - b.order)
              .map((w, idx, arr) => {
                const label = WIDGET_LABELS[w.id];
                if (!label) return null;
                return (
                  <div
                    key={w.id}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/40"
                  >
                    <input
                      type="checkbox"
                      checked={w.visible}
                      onChange={() => toggleWidget(w.id)}
                      className="h-4 w-4 rounded border-border accent-blue-600"
                    />
                    <span className="flex-1 text-sm font-medium text-foreground">
                      {label.titlePtBr}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
                      {label.tier}
                    </span>
                    <div className="flex items-center gap-0.5 w-16 justify-center">
                      <button
                        type="button"
                        onClick={() => moveWidget(w.id, "up")}
                        disabled={idx === 0}
                        className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none"
                        title="Mover para cima"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveWidget(w.id, "down")}
                        disabled={idx === arr.length - 1}
                        className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none"
                        title="Mover para baixo"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>

          <div className="mt-4 flex items-center gap-3">
            <Button
              onClick={handleSaveDashLayout}
              disabled={dashSaving}
              className="rounded-full"
            >
              {dashSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Salvar
            </Button>
            <Button
              variant="outline"
              onClick={resetDashLayout}
              className="rounded-full"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Restaurar padrão
            </Button>

            {dashMsg && (
              <span
                className={
                  dashMsg.type === "success"
                    ? "text-sm text-green-600"
                    : "text-sm text-red-500"
                }
              >
                {dashMsg.text}
              </span>
            )}
          </div>
        </Card>

        {/* ═══════════ 5. Danger Zone ═══════════ */}
        <Card
          className="rounded-[22px] border-red-500/30 p-6"
          style={cardStyle}
        >
          <h2 className="flex items-center gap-2 text-lg font-semibold text-red-500">
            <AlertTriangle className="h-5 w-5" />
            Zona de perigo
          </h2>

          <div className="mt-4 space-y-4">
            {plan !== "free" && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Cancelar assinatura</p>
                  <p className="text-sm text-muted-foreground">
                    Você perderá acesso aos recursos premium.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="rounded-full border-red-500/30 text-red-500 hover:bg-red-500/10"
                  onClick={openPortal}
                  disabled={portalLoading}
                >
                  {portalLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Cancelar assinatura
                </Button>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Excluir conta</p>
                <p className="text-sm text-muted-foreground">
                  Ação permanente. Todos os seus dados serão removidos.
                </p>
              </div>
              <Button
                variant="outline"
                className="rounded-full border-red-500/30 text-red-500 hover:bg-red-500/10"
                onClick={() => setShowDeleteModal(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir conta
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* ═══════════ Delete Account Modal ═══════════ */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card
            className="relative w-full max-w-md rounded-[22px] p-6"
            style={cardStyle}
          >
            <button
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteConfirm("");
              }}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="flex items-center gap-2 text-lg font-semibold text-red-500">
              <AlertTriangle className="h-5 w-5" />
              Excluir conta
            </h2>

            <p className="mt-3 text-sm text-muted-foreground">
              Esta ação é <strong>permanente e irreversível</strong>. Todos os
              seus dados, incluindo trades, contas e configurações, serão
              removidos.
            </p>

            <p className="mt-4 text-sm">
              Digite <strong>EXCLUIR</strong> abaixo para confirmar:
            </p>

            <Input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="EXCLUIR"
              className="mt-2"
            />

            <div className="mt-4 flex justify-end gap-3">
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirm("");
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                className="rounded-full"
                disabled={deleteConfirm !== "EXCLUIR" || deleting}
                onClick={async () => {
                  setDeleting(true);
                  try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session) return;

                    const res = await fetch("/api/account/delete", {
                      method: "DELETE",
                      headers: { Authorization: `Bearer ${session.access_token}` },
                    });
                    const json = await res.json();
                    if (!res.ok) throw new Error(json.error ?? "Erro ao excluir conta");

                    localStorage.clear();
                    window.location.href = "/";
                  } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : "Erro ao excluir conta";
                    alert(msg);
                    setDeleting(false);
                  }
                }}
              >
                {deleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                {deleting ? "Excluindo..." : "Excluir minha conta"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
