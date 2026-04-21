import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Check } from "lucide-react";
import { HeroPrimaryCta } from "@/components/landing/HeroCta";

export const revalidate = 3600;

const SLUGS = ["journal", "dexter", "macro"] as const;
type Slug = (typeof SLUGS)[number];

const BULLET_COUNT: Record<Slug, number> = { journal: 6, dexter: 6, macro: 6 };

export function generateStaticParams() {
  return SLUGS.map((slug) => ({ slug }));
}

export default async function FeaturePage({
  params,
}: {
  params: { locale: string; slug: string };
}) {
  if (!(SLUGS as readonly string[]).includes(params.slug)) {
    notFound();
  }
  setRequestLocale(params.locale);
  const slug = params.slug as Slug;
  const t = await getTranslations(`features.pages.${slug}`);
  const ui = await getTranslations("features");
  const bullets = Array.from({ length: BULLET_COUNT[slug] }, (_, i) =>
    t(`bullets.${i}`),
  );

  return (
    <article className="mx-auto max-w-3xl px-4 sm:px-6 py-20 lg:py-28">
      <Link
        href="/features"
        className="inline-flex items-center text-[12px] text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        ← {ui("backToHub")}
      </Link>

      <div className="flex items-center gap-3 mb-4">
        <span className="text-[11px] tracking-[0.18em] font-mono text-amber-600 dark:text-amber-500">
          {t("label")}
        </span>
      </div>
      <h1 className="text-[32px] sm:text-[44px] lg:text-[56px] font-semibold leading-[1.05] tracking-tight text-foreground">
        {t("title")}
      </h1>
      <p className="mt-5 text-[17px] sm:text-[19px] text-muted-foreground leading-relaxed">
        {t("subtitle")}
      </p>

      <ul className="mt-12 space-y-4">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-3 text-[15px] text-foreground/90 leading-relaxed">
            <Check className="w-4 h-4 mt-1 shrink-0 text-emerald-600 dark:text-emerald-500" aria-hidden />
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <div className="mt-16 pt-10 border-t border-border flex flex-col sm:flex-row gap-3">
        <HeroPrimaryCta className="inline-flex items-center justify-center rounded-full bg-zinc-900 text-white px-6 py-3 text-[14px] sm:text-[15px] font-medium hover:bg-zinc-800 transition-colors min-h-[48px]">
          {t("cta.primary")}
        </HeroPrimaryCta>
        <Link
          href="/pricing"
          className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground px-4 py-3 text-[14px] sm:text-[15px] transition-colors min-h-[48px]"
        >
          {t("cta.ghost")}
        </Link>
      </div>
    </article>
  );
}
