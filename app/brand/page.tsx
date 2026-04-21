// /brand — internal dogfood page for Track A brand primitives.
//
// Renders every brand component in every meaningful state so we can eyeball
// regressions in both themes (Light + Terminal). Not linked in the public
// nav; reachable by typing /brand in the URL.
//
// Keep this page read-only relative to production surfaces: it pulls from
// the barrel exports only (@/components/brand, @/lib/brand).
//
// Client component — ThemeToggle + UltraLock + icon props require the
// client boundary. Metadata + robots live in app/brand/layout.tsx.

"use client";

import { AlertTriangle, Crown, Shield } from "lucide-react";
import {
  BrandMark,
  Dexter,
  DEXTER_MOODS,
  ThemeToggle,
  UltraBadge,
  UltraLock,
} from "@/components/brand";
import { voice, pick } from "@/lib/brand";

type UltraVariant = "solid" | "outline" | "ghost";
type UltraSize = "sm" | "md" | "lg";

const ULTRA_VARIANTS: ReadonlyArray<UltraVariant> = ["solid", "outline", "ghost"];
const ULTRA_SIZES: ReadonlyArray<UltraSize> = ["sm", "md", "lg"];

export default function BrandDogfoodPage() {
  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <header className="mb-12 flex items-center justify-between gap-6">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Track A · dogfood
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Brand primitives
            </h1>
            <p className="mt-2 max-w-xl text-sm text-[hsl(var(--muted-foreground))]">
              Superfície interna para auditar componentes e tokens da marca em
              ambos os temas (Claro / Terminal). Não aparece no menu.
            </p>
          </div>
          <ThemeToggle />
        </header>

        <main className="flex flex-col gap-16">
          <BrandMarkSection />
          <DexterSection />
          <UltraBadgeSection />
          <UltraLockSection />
          <ThemeToggleSection />
          <VoiceSection />
        </main>

        <footer className="mt-20 border-t border-[hsl(var(--border))] pt-6 font-mono text-[11px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
          Última revisão · A-10 · abril 2026
        </footer>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-6">
        <h2 className="font-mono text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 text-lg font-medium tracking-tight">{subtitle}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function Cell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-sm border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
      <span className="font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
        {label}
      </span>
      <div className="flex min-h-[48px] items-center">{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function BrandMarkSection() {
  return (
    <Section title="BrandMark" subtitle="Logo + wordmark em três tamanhos">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Cell label="size=base">
          <BrandMark size="base" />
        </Cell>
        <Cell label="size=lg">
          <BrandMark size="lg" />
        </Cell>
        <Cell label="size=xl">
          <BrandMark size="xl" />
        </Cell>
      </div>
    </Section>
  );
}

function DexterSection() {
  return (
    <Section
      title="Dexter"
      subtitle="Mascote pixel-art em 7 moods"
    >
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
        {DEXTER_MOODS.map((mood) => (
          <Cell key={mood} label={mood}>
            <Dexter mood={mood} size={48} />
          </Cell>
        ))}
      </div>
    </Section>
  );
}

function UltraBadgeSection() {
  return (
    <Section
      title="UltraBadge"
      subtitle="3 variantes × 3 tamanhos + override de label/ícone"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {ULTRA_VARIANTS.map((variant) => (
          <Cell key={variant} label={`variant=${variant}`}>
            <div className="flex items-center gap-3">
              {ULTRA_SIZES.map((size) => (
                <UltraBadge key={size} variant={variant} size={size} />
              ))}
            </div>
          </Cell>
        ))}
        <Cell label="label='ULTRA ONLY'">
          <UltraBadge label="ULTRA ONLY" />
        </Cell>
        <Cell label="icon=Crown">
          <UltraBadge icon={Crown} />
        </Cell>
        <Cell label="icon=null">
          <UltraBadge icon={null} />
        </Cell>
      </div>
    </Section>
  );
}

function UltraLockSection() {
  return (
    <Section
      title="UltraLock"
      subtitle="active=true cobre filhos; active=false é passthrough"
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Cell label="active=true + cta.href">
          <UltraLock
            active
            cta={{ label: "Ver planos", href: "/pricing" }}
            className="h-40 w-full"
          >
            <div className="flex h-full w-full items-center justify-center rounded-sm border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] text-sm">
              Conteúdo gated
            </div>
          </UltraLock>
        </Cell>

        <Cell label="active=false (passthrough)">
          <UltraLock active={false} className="h-40 w-full">
            <div className="flex h-40 w-full items-center justify-center rounded-sm border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-sm">
              Renderiza normal
            </div>
          </UltraLock>
        </Cell>

        <Cell label='active + labels custom + blur="lg"'>
          <UltraLock
            active
            label="MT5 Live"
            hint="Streaming em tempo real é Ultra."
            cta={{ label: "Desbloquear" }}
            blur="lg"
            className="h-40 w-full"
          >
            <div className="flex h-full w-full items-center justify-center rounded-sm bg-[hsl(var(--primary)/0.1)] text-sm">
              MT5 Live widget
            </div>
          </UltraLock>
        </Cell>

        <Cell label="sem CTA">
          <UltraLock active className="h-40 w-full">
            <div className="flex h-full w-full items-center justify-center rounded-sm bg-[hsl(var(--muted)/0.3)] text-sm">
              Gated sem botão
            </div>
          </UltraLock>
        </Cell>
      </div>
    </Section>
  );
}

function ThemeToggleSection() {
  return (
    <Section
      title="ThemeToggle"
      subtitle="Segmented + icon, pt + en"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Cell label='variant="segmented" · locale="pt"'>
          <ThemeToggle />
        </Cell>
        <Cell label='variant="segmented" · locale="en"'>
          <ThemeToggle locale="en" />
        </Cell>
        <Cell label='variant="icon" · locale="pt"'>
          <ThemeToggle variant="icon" />
        </Cell>
        <Cell label='variant="icon" · locale="en"'>
          <ThemeToggle variant="icon" locale="en" />
        </Cell>
      </div>
    </Section>
  );
}

function VoiceSection() {
  const rows: ReadonlyArray<{
    path: string;
    ptEn: { pt: string; en: string };
  }> = [
    { path: "greetings.morning", ptEn: voice.greetings.morning },
    { path: "cta.connectMt5", ptEn: voice.cta.connectMt5 },
    { path: "cta.upgradeUltra", ptEn: voice.cta.upgradeUltra },
    { path: "loading.analyzing", ptEn: voice.loading.analyzing },
    { path: "errors.dexterOffline", ptEn: voice.errors.dexterOffline },
    { path: "upgrade.ultraGate", ptEn: voice.upgrade.ultraGate },
    { path: "upgrade.ultraLockedHint", ptEn: voice.upgrade.ultraLockedHint },
    { path: "empty.noTrades", ptEn: voice.empty.noTrades },
    { path: "success.importDone", ptEn: voice.success.importDone },
    { path: "confirm.deleteTrade", ptEn: voice.confirm.deleteTrade },
    { path: "onboarding.welcome", ptEn: voice.onboarding.welcome },
    { path: "nav.dashboard", ptEn: voice.nav.dashboard },
  ];

  return (
    <Section
      title="Voice"
      subtitle="Amostra bilíngue de lib/brand/voice.ts"
    >
      <div className="overflow-hidden rounded-sm border border-[hsl(var(--border))]">
        <table className="w-full text-sm">
          <thead className="bg-[hsl(var(--muted)/0.4)] font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            <tr>
              <th className="px-4 py-2 text-left">key</th>
              <th className="px-4 py-2 text-left">pt</th>
              <th className="px-4 py-2 text-left">en</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[hsl(var(--border))] bg-[hsl(var(--card))]">
            {rows.map(({ path, ptEn }) => (
              <tr key={path}>
                <td className="px-4 py-2 font-mono text-[11px] text-[hsl(var(--muted-foreground))]">
                  {path}
                </td>
                <td className="px-4 py-2">{pick(ptEn, "pt")}</td>
                <td className="px-4 py-2 text-[hsl(var(--muted-foreground))]">
                  {pick(ptEn, "en")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-sm border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)] p-3 text-xs text-[hsl(var(--muted-foreground))]">
        <AlertTriangle width={14} height={14} className="mt-0.5" aria-hidden />
        <span>
          Mostra apenas uma amostra. Fonte completa:{" "}
          <code className="font-mono">lib/brand/voice.ts</code> — 48 strings
          bilíngues distribuídas em 10 namespaces (greetings, cta, loading,
          errors, upgrade, theme, empty, success, confirm, onboarding, nav).
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
        <Shield width={14} height={14} aria-hidden />
        <span>Página fora do index do Google (robots: noindex, nofollow).</span>
      </div>
    </Section>
  );
}
