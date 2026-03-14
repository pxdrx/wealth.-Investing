import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { FEATURES } from "@/lib/landing-data";
import type { Metadata } from "next";

/* ── slug → feature index mapping ──────────────────────────── */
const SLUG_MAP: Record<string, number> = {
  registre: 0,
  analise: 1,
  evolua: 2,
  proteja: 3,
};

/* ── screenshots per feature ───────────────────────────────── */
const SCREENSHOTS: Record<string, { src: string; alt: string }[]> = {
  registre: [
    { src: "/screenshots/journal.png", alt: "Journal de trades com importação automática" },
    { src: "/screenshots/dashboard.png", alt: "Dashboard com múltiplas contas conectadas" },
  ],
  analise: [
    { src: "/screenshots/dashboard.png", alt: "Dashboard de performance com KPIs" },
    { src: "/screenshots/calendar.png", alt: "Calendário PnL com heatmap de resultados" },
  ],
  evolua: [
    { src: "/screenshots/journal.png", alt: "Journal inteligente com tags e notas" },
    { src: "/screenshots/calendar.png", alt: "Calendário com observações diárias" },
  ],
  proteja: [
    { src: "/screenshots/dashboard.png", alt: "Dashboard com métricas de risco" },
    { src: "/screenshots/calendar.png", alt: "Calendário de drawdown e controle" },
  ],
};

/* ── detailed benefits per feature ─────────────────────────── */
const BENEFITS: Record<string, string[]> = {
  registre: [
    "Importe trades de MT4, MT5, cTrader e mais com um clique",
    "Sincronização automática detecta novas operações",
    "Suporte a múltiplas contas: pessoais, prop firms, crypto",
    "Deduplicação inteligente evita trades duplicados",
    "Histórico completo com todos os detalhes da operação",
  ],
  analise: [
    "Dashboard completo com P&L, win rate, profit factor e expectancy",
    "Calendário heatmap mostra seus resultados dia a dia",
    "Filtre por período, conta, setup ou tag",
    "Identifique padrões sazonais e horários de melhor performance",
    "Compare performance entre diferentes setups e estratégias",
  ],
  evolua: [
    "Registre cada trade com contexto: setup, emoção, qualidade de execução",
    "Tags customizáveis para categorizar operações",
    "Observações diárias no calendário para revisão contínua",
    "Blue dots indicam dias com anotações para fácil navegação",
    "Auto-save garante que você nunca perca uma observação",
  ],
  proteja: [
    "Acompanhe drawdown máximo e risco por operação",
    "Alertas do TradingView integrados diretamente na plataforma",
    "Controle de fases para contas de mesa proprietária",
    "Visão consolidada de saques e payouts",
    "Regras de risco visíveis para disciplina operacional",
  ],
};

/* ── static params for SSG ─────────────────────────────────── */
export function generateStaticParams() {
  return Object.keys(SLUG_MAP).map((slug) => ({ slug }));
}

/* ── metadata ──────────────────────────────────────────────── */
export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const idx = SLUG_MAP[params.slug];
  if (idx === undefined) return { title: "Feature — wealth.Investing" };
  const feature = FEATURES[idx];
  return {
    title: `${feature.tag} — wealth.Investing`,
    description: feature.description,
  };
}

/* ── page ───────────────────────────────────────────────────── */
export default function FeatureDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const idx = SLUG_MAP[params.slug];
  if (idx === undefined) notFound();

  const feature = FEATURES[idx];
  const screenshots = SCREENSHOTS[params.slug] ?? [];
  const benefits = BENEFITS[params.slug] ?? [];

  /* navigation between features */
  const slugs = Object.keys(SLUG_MAP);
  const prevSlug = idx > 0 ? slugs[idx - 1] : null;
  const nextSlug = idx < slugs.length - 1 ? slugs[idx + 1] : null;
  const prevFeature = prevSlug ? FEATURES[SLUG_MAP[prevSlug]] : null;
  const nextFeature = nextSlug ? FEATURES[SLUG_MAP[nextSlug]] : null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "hsl(var(--background))" }}>
      {/* ── Back link ── */}
      <div className="mx-auto max-w-5xl px-6 pt-8">
        <Link
          href="/#recursos"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar
        </Link>
      </div>

      {/* ── Hero ── */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <span className="inline-block font-mono text-xs tracking-[0.15em] uppercase text-muted-foreground mb-4">
          [{feature.number}] {feature.tag}
        </span>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tighter-apple mb-6">
          {feature.headline}
        </h1>
        <p className="text-lg leading-relaxed text-muted-foreground max-w-3xl">
          {feature.description}
        </p>
      </section>

      {/* ── Screenshots ── */}
      {screenshots.length > 0 && (
        <section className="mx-auto max-w-5xl px-6 pb-16">
          <div className="grid gap-6 md:grid-cols-2">
            {screenshots.map((shot) => (
              <div
                key={shot.src}
                className="overflow-hidden rounded-[22px] border"
                style={{
                  backgroundColor: "hsl(var(--card))",
                  borderColor: "hsl(var(--border))",
                }}
              >
                <Image
                  src={shot.src}
                  alt={shot.alt}
                  width={800}
                  height={500}
                  className="w-full h-auto"
                  priority
                />
                <p className="px-5 py-3 text-sm text-muted-foreground">
                  {shot.alt}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Features detail ── */}
      <section className="mx-auto max-w-5xl px-6 pb-16">
        <h2 className="text-xl font-semibold tracking-tight mb-2">
          {feature.subLabel}
        </h2>
        <div className="grid gap-6 md:grid-cols-3 mt-8">
          {feature.features.map((feat) => (
            <div
              key={feat.title}
              className="rounded-[22px] p-6 border"
              style={{
                backgroundColor: "hsl(var(--card))",
                borderColor: "hsl(var(--border))",
              }}
            >
              <h3 className="text-base font-semibold mb-2">{feat.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {feat.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Benefits ── */}
      {benefits.length > 0 && (
        <section className="mx-auto max-w-5xl px-6 pb-16">
          <h2 className="text-xl font-semibold tracking-tight mb-6">
            Por que usar
          </h2>
          <ul className="space-y-3">
            {benefits.map((benefit) => (
              <li
                key={benefit}
                className="flex items-start gap-3 text-sm leading-relaxed text-muted-foreground"
              >
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                {benefit}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── CTA ── */}
      <section className="mx-auto max-w-5xl px-6 pb-16 text-center">
        <div
          className="rounded-[22px] p-10 border"
          style={{
            backgroundColor: "hsl(var(--card))",
            borderColor: "hsl(var(--border))",
          }}
        >
          <h2 className="text-2xl font-bold tracking-tight mb-3">
            Comece a usar agora
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Crie sua conta gratuita e transforme seus dados em consistência.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg px-7 py-3.5 text-sm font-medium text-white transition-all hover:brightness-110"
            style={{ backgroundColor: "hsl(var(--primary))" }}
          >
            Comece grátis
          </Link>
        </div>
      </section>

      {/* ── Prev / Next nav ── */}
      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="flex justify-between items-center">
          {prevFeature && prevSlug ? (
            <Link
              href={`/features/${prevSlug}`}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {prevFeature.tag}
            </Link>
          ) : (
            <span />
          )}
          {nextFeature && nextSlug ? (
            <Link
              href={`/features/${nextSlug}`}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {nextFeature.tag}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <span />
          )}
        </div>
      </section>
    </div>
  );
}
