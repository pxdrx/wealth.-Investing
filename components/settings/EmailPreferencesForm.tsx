// components/settings/EmailPreferencesForm.tsx
"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

export function EmailPreferencesForm({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function toggle(next: boolean) {
    setBusy(true); setErr(null);
    const prev = enabled;
    setEnabled(next);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const r = await fetch("/api/settings/email-preferences", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ recapEnabled: next }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? "falhou");
    } catch (e) {
      setEnabled(prev);
      setErr(e instanceof Error ? e.message : "erro");
    } finally { setBusy(false); }
  }

  return (
    <div className="rounded-[22px] p-5" style={{ backgroundColor: "hsl(var(--card))" }}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-tight">Relatório semanal por email</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Resumo dos seus trades, P&L, melhor/pior trade e streak. Domingos às 18:00 BRT.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => toggle(!enabled)}
          aria-pressed={enabled}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${enabled ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"}`}
        >
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${enabled ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </div>
      {err && <p className="mt-2 text-xs text-red-500">{err}</p>}
    </div>
  );
}
