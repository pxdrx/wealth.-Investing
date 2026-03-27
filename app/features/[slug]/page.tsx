import { notFound } from "next/navigation";
import { FEATURES } from "@/lib/landing-data";
import { FEATURE_PAGES } from "@/components/landing/feature-pages/feature-page-data";
import { FeaturePageClient } from "@/components/landing/feature-pages/FeaturePageClient";
import type { Metadata } from "next";

/* ── slug → feature index mapping ──────────────────────────── */
const SLUG_MAP: Record<string, number> = {
  registre: 0,
  analise: 1,
  evolua: 2,
  proteja: 3,
  dexter: 4,
  backtest: 5,
};

const SLUGS = Object.keys(SLUG_MAP);

/* ── static params for SSG ─────────────────────────────────── */
export function generateStaticParams() {
  return SLUGS.map((slug) => ({ slug }));
}

/* ── metadata ──────────────────────────────────────────────── */
export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const feature = FEATURE_PAGES[params.slug];
  if (!feature) return { title: "Feature — wealth.Investing" };

  const titles: Record<string, string> = {
    registre: "Registro Automático de Operações",
    analise: "Análise Profunda de Performance",
    evolua: "Diário de Trading Inteligente",
    proteja: "Gestão de Risco e Proteção",
    dexter: "Analista Dexter — Assistente de Research com IA",
    backtest: "Backtesting — Teste Estratégias sem Risco",
  };

  return {
    title: `${titles[params.slug] ?? feature.tag} — wealth.Investing`,
    description: feature.heroDescription,
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

  const feature = FEATURE_PAGES[params.slug];
  if (!feature) notFound();

  const prevSlug = idx > 0 ? SLUGS[idx - 1] : null;
  const nextSlug = idx < SLUGS.length - 1 ? SLUGS[idx + 1] : null;
  const prevIdx = prevSlug ? SLUG_MAP[prevSlug] : -1;
  const nextIdx = nextSlug ? SLUG_MAP[nextSlug] : -1;
  const prevTag = prevSlug
    ? prevIdx < FEATURES.length
      ? FEATURES[prevIdx].tag
      : FEATURE_PAGES[prevSlug]?.tag ?? null
    : null;
  const nextTag = nextSlug
    ? nextIdx < FEATURES.length
      ? FEATURES[nextIdx].tag
      : FEATURE_PAGES[nextSlug]?.tag ?? null
    : null;

  return (
    <FeaturePageClient
      feature={feature}
      prevSlug={prevSlug}
      nextSlug={nextSlug}
      prevTag={prevTag}
      nextTag={nextTag}
    />
  );
}
