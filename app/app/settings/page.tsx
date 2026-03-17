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
import { getMyProfile } from "@/lib/profile";
import {
  Loader2,
  Save,
  ExternalLink,
  AlertTriangle,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";

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

  // ── Load profile + email ──
  useEffect(() => {
    let mounted = true;
    async function load() {
      const [profile, { data: { session } }] = await Promise.all([
        getMyProfile(),
        supabase.auth.getSession(),
      ]);
      if (!mounted) return;
      if (profile) setDisplayName(profile.display_name ?? "");
      if (session?.user?.email) setEmail(session.user.email);
      setProfileLoading(false);
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
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada");
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName.trim() })
        .eq("user_id", session.user.id);
      if (error) throw error;
      setSaveMsg({ type: "success", text: "Perfil salvo com sucesso!" });
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
      if (!res.ok || !json.url) throw new Error(json.error ?? "Erro ao abrir portal");
      window.location.href = json.url;
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Erro ao abrir portal";
      alert(msg);
    } finally {
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

        {/* ═══════════ 4. Danger Zone ═══════════ */}
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
                disabled={deleteConfirm !== "EXCLUIR"}
                onClick={() => {
                  // TODO: Implement account deletion backend
                  // This should call an API route that:
                  // 1. Cancels any active Stripe subscription
                  // 2. Deletes all user data from Supabase tables
                  // 3. Deletes the auth user
                  // 4. Redirects to landing page
                  alert("Funcionalidade em desenvolvimento.");
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir minha conta
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
