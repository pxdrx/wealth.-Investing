import Link from "next/link";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { HeroPrimaryCta } from "@/components/landing/HeroCta";

export const revalidate = 3600;

const SECTION_KEYS = [
  "section_01",
  "section_02",
  "section_03",
  "section_04",
  "section_05",
  "section_06",
] as const;

export default async function ManifestoPage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  const t = await getTranslations("manifesto");

  return (
    <article className="mx-auto max-w-3xl px-4 sm:px-6 py-20 lg:py-28">
      <div className="text-[11px] uppercase tracking-[0.18em] font-mono text-amber-600 dark:text-amber-500 mb-4">
        {t("eyebrow")}
      </div>
      <h1 className="text-[36px] sm:text-[48px] lg:text-[60px] font-semibold leading-[1.05] tracking-tight text-foreground">
        {t("heading")}
      </h1>
      <p className="mt-6 text-[17px] sm:text-[19px] text-muted-foreground leading-relaxed">
        {t("intro.body")}
      </p>

      <div className="mt-14 space-y-12">
        {SECTION_KEYS.map((key, i) => (
          <section key={key} className="grid grid-cols-1 sm:grid-cols-[80px_1fr] gap-4 sm:gap-8">
            <div className="text-[11px] tracking-[0.18em] font-mono text-amber-600 dark:text-amber-500 pt-1">
              {String(i + 1).padStart(2, "0")}
            </div>
            <div>
              <h2 className="text-[22px] sm:text-[26px] font-semibold tracking-tight text-foreground leading-tight">
                {t(`${key}.title`)}
              </h2>
              <p className="mt-3 text-[15px] text-foreground/85 leading-relaxed whitespace-pre-line">
                {t(`${key}.body`)}
              </p>
            </div>
          </section>
        ))}
      </div>

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
