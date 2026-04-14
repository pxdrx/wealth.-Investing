"use client";

import { useCallback, useEffect, useState } from "react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSubscription } from "@/components/context/SubscriptionContext";
import { SubscriptionBadge } from "@/components/billing/SubscriptionBadge";
import { ChurnPreventionModal } from "@/components/billing/ChurnPreventionModal";
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
  GraduationCap,
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
  const [profileError, setProfileError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // ── Subscription ──
  const { plan, status, subscription, isLoading: subLoadingRaw } =
    useSubscription();
  const [subTimedOut, setSubTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSubTimedOut(true), 4000);
    return () => clearTimeout(t);
  }, []);
  const subLoading = subLoadingRaw && !subTimedOut;

  // ── Portal loading ──
  const [portalLoading, setPortalLoading] = useState(false);

  // ── Churn prevention modal ──
  const [showChurnModal, setShowChurnModal] = useState(false);
  const [userId, setUserId] = useState<string>("");

  // ── Delete modal ──
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  // ── Mentor ──
  const [myMentor, setMyMentor] = useState<{ id: string; displayName: string; since: string } | null>(null);
  const [mentorLoading, setMentorLoading] = useState(true);
  const [inviteCode, setInviteCode] = useState("");
  const [linkingMentor, setLinkingMentor] = useState(false);
  const [mentorMsg, setMentorMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [revokingMentor, setRevokingMentor] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);

  // ── Dashboard layout ──
  const [dashLayout, setDashLayout] = useState<DashboardLayout>(DEFAULT_LAYOUT);
  const [dashLayoutLoaded, setDashLayoutLoaded] = useState(false);
  const [dashSaving, setDashSaving] = useState(false);
  const [dashMsg, setDashMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ── Load profile + email ──
  useEffect(() => {
    let mounted = true;
    async function load() {
      setProfileLoading(true);
      setProfileError(null);
      try {
        const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 10_000));
        const [profile, { data: { session } }] = await Promise.race([
          Promise.all([
            getMyProfile(),
            supabase.auth.getSession(),
          ]),
          timeout,
        ]) as [Awaited<ReturnType<typeof getMyProfile>>, { data: { session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"] } }];
        if (!mounted) return;
        if (profile) {
          setDisplayName(profile.display_name ?? "");
        }
        if (session?.user?.email) setEmail(session.user.email);
        if (session?.user?.id) setUserId(session.user.id);
      } catch (err) {
        console.error("[settings] failed to load profile:", err);
        if (mounted) {
          setProfileError(
            err instanceof Error ? err.message : "Erro ao carregar perfil"
          );
        }
      } finally {
        if (mounted) setProfileLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryKey]);

  // ── Load mentor ──
  useEffect(() => {
    let mounted = true;
    const safety = setTimeout(() => { if (mounted) setMentorLoading(false); }, 8000);
    async function loadMentor() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setMentorLoading(false); return; }
        const res = await fetch("/api/mentor/my-mentor", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const json = await res.json();
        if (!mounted) return;
        if (json.ok && json.mentor) {
          setMyMentor(json.mentor);
        }
      } catch {} finally {
        if (mounted) setMentorLoading(false);
      }
    }
    loadMentor();
    return () => { mounted = false; clearTimeout(safety); };
  }, []);

  // ── Load dashboard layout (independent from profile) ──
  useEffect(() => {
    let mounted = true;
    async function loadLayout() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted || !session?.user?.id) {
          if (mounted) setDashLayoutLoaded(true);
          return;
        }
        const uid = session.user.id;

        // localStorage is source of truth (dashboard writes here on every change)
        let loaded = false;
        try {
          const stored = localStorage.getItem(`wealth-dash-layout-${uid}`);
          if (stored) {
            setDashLayout(mergeLayout(JSON.parse(stored)));
            loaded = true;
          }
        } catch {}

        // Fallback to DB if localStorage is empty
        if (!loaded) {
          try {
            const { data: layoutProfile } = await supabase
              .from("profiles")
              .select("dashboard_layout")
              .eq("id", uid)
              .maybeSingle();
            if (!mounted) return;
            if (layoutProfile?.dashboard_layout) {
              setDashLayout(mergeLayout(layoutProfile.dashboard_layout as DashboardLayout));
            }
          } catch {}
        }
      } catch {
        // ignore — layout falls back to DEFAULT_LAYOUT
      } finally {
        if (mounted) setDashLayoutLoaded(true);
      }
    }
    loadLayout();
    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Convergent safety fallback — prevents infinite spinner in any pathological case ──
  useEffect(() => {
    const t = setTimeout(() => {
      setProfileLoading(false);
      setMentorLoading(false);
      setDashLayoutLoaded(true);
      console.warn("[load-safety] settings convergent fallback");
    }, 7_000);
    return () => clearTimeout(t);
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

  // ── Link mentor ──
  const handleLinkMentor = useCallback(async () => {
    if (!inviteCode.trim()) return;
    setLinkingMentor(true);
    setMentorMsg(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada");
      const res = await fetch("/api/mentor/link", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: inviteCode.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Erro ao vincular mentor");
      setMyMentor({ id: json.mentorId, displayName: json.mentorName, since: new Date().toISOString() });
      setInviteCode("");
      setMentorMsg({ type: "success", text: `Vinculado ao mentor ${json.mentorName}!` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao vincular mentor";
      setMentorMsg({ type: "error", text: msg });
    } finally {
      setLinkingMentor(false);
    }
  }, [inviteCode]);

  // ── Revoke mentor ──
  const handleRevokeMentor = useCallback(async () => {
    setRevokingMentor(true);
    setMentorMsg(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada");
      const res = await fetch("/api/mentor/link", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Erro ao revogar");
      setMyMentor(null);
      setShowRevokeConfirm(false);
      setMentorMsg({ type: "success", text: "Acesso do mentor revogado com sucesso." });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao revogar";
      setMentorMsg({ type: "error", text: msg });
    } finally {
      setRevokingMentor(false);
    }
  }, []);

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
      const sorted = [...prev.widgets].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex((w) => w.id === id);
      if (idx === -1) return prev;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sorted.length) return prev;

      // Swap positions in array
      [sorted[idx], sorted[swapIdx]] = [sorted[swapIdx], sorted[idx]];

      // Normalize: assign consecutive order values (0, 1, 2, ...)
      const normalized = sorted.map((w, i) => ({ ...w, order: i }));

      return { ...prev, widgets: normalized };
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
          ) : profileError ? (
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2 text-sm text-red-500">
                <AlertTriangle className="h-4 w-4" />
                {profileError}
              </div>
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => setRetryKey((k) => k + 1)}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Tentar novamente
              </Button>
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
                <p className="text-xs text-muted-foreground/70">
                  Para alterar o email, entre em contato com o suporte.
                </p>
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

        {/* ═══════════ Mentor ═══════════ */}
        <Card className="rounded-[22px] p-6" style={cardStyle}>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <GraduationCap className="h-5 w-5 text-amber-500" />
            Mentor
          </h2>

          {mentorLoading ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando...
            </div>
          ) : myMentor ? (
            <div className="mt-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Seu mentor:</p>
                  <p className="text-base font-semibold">{myMentor.displayName}</p>
                  <p className="text-xs text-muted-foreground">
                    Vinculado desde {new Date(myMentor.since).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {!showRevokeConfirm ? (
                    <Button
                      variant="outline"
                      className="rounded-full border-red-500/30 text-red-500 hover:bg-red-500/10"
                      onClick={() => setShowRevokeConfirm(true)}
                    >
                      Revogar acesso
                    </Button>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="destructive"
                        className="rounded-full"
                        onClick={handleRevokeMentor}
                        disabled={revokingMentor}
                      >
                        {revokingMentor ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Confirmar
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-full"
                        onClick={() => setShowRevokeConfirm(false)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Seu mentor pode visualizar seu journal de trades e adicionar notas de orientação. Você pode revogar o acesso a qualquer momento.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Vincule-se a um mentor para receber acompanhamento personalizado.
              </p>
              <div className="flex items-center gap-3">
                <Input
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="Código do mentor (ex: MENTOR-A3X9)"
                  className="max-w-xs"
                />
                <Button
                  onClick={handleLinkMentor}
                  disabled={linkingMentor || !inviteCode.trim()}
                  className="rounded-full"
                >
                  {linkingMentor ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Vincular
                </Button>
              </div>
            </div>
          )}

          {mentorMsg && (
            <div className={mentorMsg.type === "success" ? "mt-3 flex items-center gap-2 text-sm text-green-600" : "mt-3 flex items-center gap-2 text-sm text-red-500"}>
              <span>{mentorMsg.text}</span>
              <button onClick={() => setMentorMsg(null)} className="underline text-xs opacity-70 hover:opacity-100">Fechar</button>
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

          {!dashLayoutLoaded ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando layout...
            </div>
          ) : (
          <>
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
          </>
          )}
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
                  onClick={() => setShowChurnModal(true)}
                  disabled={portalLoading}
                >
                  Cancelar assinatura
                </Button>
              </div>
            )}

            <ChurnPreventionModal
              open={showChurnModal}
              onClose={() => setShowChurnModal(false)}
              onConfirmCancel={() => {
                setShowChurnModal(false);
                openPortal();
              }}
              userId={userId}
            />

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
