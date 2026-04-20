"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { safeGetSession } from "@/lib/supabase/safe-session";
import { useEntitlements } from "@/hooks/use-entitlements";

type Mood = "default" | "thinking" | "alert" | "celebrating";

interface DexterPayload {
  insight: string;
  context: string;
  mood: Mood;
  cta?: { label: string; href: string };
  generatedAt: string;
  cacheHit: boolean;
}

type LoadState =
  | { kind: "loading" }
  | { kind: "success"; data: DexterPayload }
  | { kind: "error" }
  | { kind: "empty" };

// TODO(track-a): replace with <Mascot pose={mood}/> once components/brand/Mascot.tsx lands.
// Tracked in docs/BUILD-DEBT.md entry #3.
function MascotPlaceholder({ mood = "default" as Mood }) {
  const tone =
    mood === "alert"
      ? "bg-rose-500/15 text-rose-300"
      : mood === "celebrating"
        ? "bg-emerald-500/20 text-emerald-300"
        : mood === "thinking"
          ? "bg-sky-500/15 text-sky-300"
          : "bg-emerald-500/15 text-emerald-300";
  return (
    <div
      aria-hidden
      className={`grid h-12 w-12 shrink-0 place-items-center rounded-full font-bold ${tone}`}
    >
      D
    </div>
  );
}

function formatDatePt(): string {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

function freshnessLabel(generatedAt: string): string | null {
  const then = new Date(generatedAt).getTime();
  if (Number.isNaN(then)) return null;
  const diffMs = Date.now() - then;
  const hours = Math.floor(diffMs / (60 * 60 * 1000));
  if (hours < 1) return "atualizado agora";
  if (hours === 1) return "atualizado há 1h";
  return `atualizado há ${hours}h`;
}

export function TodayMatters() {
  const { hasAccess, plan } = useEntitlements();
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: { session } } = await safeGetSession();
      if (cancelled) return;
      if (!session) {
        setState({ kind: "error" });
        return;
      }
      try {
        const res = await fetch("/api/dexter/today", {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: "no-store",
        });
        if (cancelled) return;
        if (!res.ok) {
          setState({ kind: "error" });
          return;
        }
        const data = (await res.json()) as DexterPayload | { ok: false };
        if (cancelled) return;
        if ("ok" in data && data.ok === false) {
          setState({ kind: "error" });
          return;
        }
        const payload = data as DexterPayload;
        const emptyHeuristic =
          payload.cta?.href === "/app/settings" && /MT5|broker|conectar/i.test(payload.insight);
        setState(
          emptyHeuristic
            ? { kind: "empty" }
            : { kind: "success", data: payload }
        );
      } catch {
        if (!cancelled) setState({ kind: "error" });
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!hasAccess("dexterTodayCard")) return null;

  return (
    <section
      aria-label="Hoje, isso importa"
      className="w-full rounded-[22px] border p-6 md:p-8"
      style={{
        backgroundColor: "hsl(220 8% 10%)",
        borderColor: "hsl(220 6% 18%)",
        color: "hsl(0 0% 98%)",
      }}
    >
      <Content state={state} planFree={plan === "free"} />
    </section>
  );
}

function Eyebrow({ mood = "default" as Mood, freshness }: { mood?: Mood; freshness?: string | null }) {
  return (
    <div className="flex items-center gap-3">
      <MascotPlaceholder mood={mood} />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
          Hoje, isso importa · <span className="font-medium normal-case tracking-normal text-white/50">{formatDatePt()}</span>
        </p>
        {freshness && (
          <p className="mt-0.5 text-[11px] text-white/40">{freshness}</p>
        )}
      </div>
    </div>
  );
}

function Content({ state, planFree }: { state: LoadState; planFree: boolean }) {
  if (state.kind === "loading") {
    return (
      <>
        <Eyebrow mood="thinking" />
        <div className="mt-5 space-y-3">
          <div className="h-7 w-4/5 rounded-md bg-white/10 animate-pulse" />
          <div className="h-7 w-3/5 rounded-md bg-white/10 animate-pulse" />
          <div className="mt-4 h-4 w-2/5 rounded bg-white/5 animate-pulse" />
        </div>
      </>
    );
  }

  if (state.kind === "error") {
    return (
      <>
        <Eyebrow mood="default" />
        <p className="mt-5 text-xl md:text-2xl font-semibold tracking-tight text-white/90">
          Dexter está offline no momento.
        </p>
        <p className="mt-2 text-sm text-white/60">
          Tente recarregar em alguns minutos. Seus dados continuam seguros.
        </p>
      </>
    );
  }

  if (state.kind === "empty") {
    return (
      <>
        <Eyebrow mood="default" />
        <p className="mt-5 text-2xl md:text-3xl font-semibold tracking-tight leading-tight text-white">
          Sem trades ainda — conecte o MT5 e o Dexter começa a te observar.
        </p>
        <p className="mt-2 text-sm text-white/60">
          A primeira análise roda assim que o primeiro trade importar.
        </p>
        <Link
          href="/app/settings"
          className="mt-5 inline-flex items-center rounded-full bg-white px-5 py-2 text-sm font-semibold text-zinc-900 transition-opacity hover:opacity-90"
        >
          Conectar MT5
        </Link>
      </>
    );
  }

  const { data } = state;
  // Free plan stays frozen (24h TTL); paid plans refresh every 4h — freshness label is a paid-plan signal.
  const freshness = !planFree ? freshnessLabel(data.generatedAt) : null;

  return (
    <>
      <Eyebrow mood={data.mood} freshness={freshness} />
      <p className="mt-5 text-2xl md:text-3xl font-semibold tracking-tight leading-tight text-white">
        {data.insight}
      </p>
      {data.context && (
        <p className="mt-2 text-sm text-white/60">{data.context}</p>
      )}
      {data.cta && (
        <Link
          href={data.cta.href}
          className="mt-5 inline-flex items-center rounded-full bg-white px-5 py-2 text-sm font-semibold text-zinc-900 transition-opacity hover:opacity-90"
        >
          {data.cta.label}
        </Link>
      )}
    </>
  );
}
