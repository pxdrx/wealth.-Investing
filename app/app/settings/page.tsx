"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/components/theme-provider";
import { supabase } from "@/lib/supabase/client";
import { upsertMyProfileDisplayName } from "@/lib/profile";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      setEmail(session.user.email ?? "");
    });
    supabase.from("profiles").select("display_name").maybeSingle().then(({ data }) => {
      if (data?.display_name) setDisplayName(data.display_name);
    });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    setSaved(false);
    const trimmed = displayName.trim();
    if (trimmed.length < 2) { setError("Nome deve ter pelo menos 2 caracteres."); setSaving(false); return; }
    const { error: err } = await upsertMyProfileDisplayName(trimmed);
    setSaving(false);
    if (err) { setError(err.message); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-8">Configuracoes</h1>

      {/* Perfil */}
      <section className="mb-8">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Perfil</h2>
        <div className="rounded-[16px] border border-border bg-card p-6">
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Nome de exibicao</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="input-ios"
                placeholder="Seu nome"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">E-mail</label>
              <input
                type="email"
                value={email}
                disabled
                className="input-ios opacity-50 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-muted-foreground">O e-mail nao pode ser alterado aqui.</p>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {saved && <p className="text-sm text-emerald-600">Salvo com sucesso!</p>}
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </form>
        </div>
      </section>

      {/* Tema */}
      <section className="mb-8">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Aparencia</h2>
        <div className="rounded-[16px] border border-border bg-card p-6">
          <p className="text-sm font-medium text-foreground mb-4">Tema</p>
          <div className="flex gap-3">
            {(["light", "dark", "system"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                className={`px-4 py-2 rounded-[10px] text-sm font-medium border transition-colors ${
                  theme === t
                    ? "bg-foreground text-background border-foreground"
                    : "bg-background text-foreground border-border hover:bg-muted/50"
                }`}
              >
                {t === "light" ? "Claro" : t === "dark" ? "Escuro" : "Sistema"}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Conta */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Conta</h2>
        <div className="rounded-[16px] border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground mb-4">
            Para excluir sua conta ou alterar o e-mail, entre em contato com o suporte.
          </p>
          <button
            type="button"
            onClick={async () => { await supabase.auth.signOut(); window.location.href = "/login"; }}
            className="text-sm font-medium text-destructive hover:underline"
          >
            Sair da conta
          </button>
        </div>
      </section>
    </div>
  );
}
