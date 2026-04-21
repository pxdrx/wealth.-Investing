import Link from "next/link";
import { setRequestLocale, getTranslations } from "next-intl/server";

export const revalidate = 3600;

const SLUGS = ["journal", "dexter", "macro"] as const;

export default async function FeaturesHubPage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  const t = await getTranslations("features");

  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-20 lg:py-28">
      <div className="mb-14 max-w-2xl">
        <div className="text-[11px] uppercase tracking-[0.18em] font-mono text-muted-foreground mb-3">
          {t("hub.eyebrow")}
        </div>
        <h1 className="text-[32px] sm:text-[44px] lg:text-[56px] font-semibold leading-[1.05] tracking-tight text-foreground">
          {t("hub.heading")}{" "}
          <span className="text-muted-foreground italic font-normal">
            {t("hub.headingAccent")}
          </span>
        </h1>
        <p className="mt-5 text-[15px] sm:text-[17px] text-muted-foreground max-w-xl leading-relaxed">
          {t("hub.subhead")}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
        {SLUGS.map((slug, i) => (
          <Link
            key={slug}
            href={`/features/${slug}`}
            className="group rounded-[22px] border border-border bg-card p-6 sm:p-8 flex flex-col transition-colors hover:border-amber-400/50"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[11px] tracking-[0.18em] font-mono text-amber-600 dark:text-amber-500">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-[12px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
                {t(`pages.${slug}.label`)}
              </span>
            </div>
            <p className="text-[20px] sm:text-[22px] font-semibold leading-[1.25] tracking-tight text-foreground mb-6">
              {t(`pages.${slug}.title`)}
            </p>
            <span className="mt-auto text-[13px] text-foreground/80 group-hover:text-amber-600 dark:group-hover:text-amber-500 transition-colors">
              {t("hub.cardCta")} →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
