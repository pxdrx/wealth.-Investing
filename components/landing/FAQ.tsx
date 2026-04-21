import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";

const ITEM_KEYS = [
  "q_01",
  "q_02",
  "q_03",
  "q_04",
  "q_05",
  "q_06",
  "q_07",
  "q_08",
  "q_09",
  "q_10",
] as const;

export function FAQ() {
  const t = useTranslations("faq");

  return (
    <section className="py-20 lg:py-28 border-t border-border/60">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="mb-10 lg:mb-12">
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-mono mb-3">
            {t("eyebrow")}
          </div>
          <h2 className="text-[28px] sm:text-[36px] lg:text-[44px] font-semibold leading-[1.1] tracking-tight text-foreground">
            {t("heading")}{" "}
            <span className="text-muted-foreground italic font-normal">{t("headingAccent")}</span>
          </h2>
        </div>
        <div className="divide-y divide-border border-y border-border">
          {ITEM_KEYS.map((key) => (
            <details key={key} className="group">
              <summary className="flex items-center justify-between gap-4 py-5 min-h-[56px] cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                <h3 className="text-[15px] sm:text-[16px] font-medium text-foreground">
                  {t(`${key}.q`)}
                </h3>
                <ChevronDown
                  className="w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 group-open:rotate-180"
                  aria-hidden
                />
              </summary>
              <p className="pb-5 -mt-1 text-[14px] text-muted-foreground leading-relaxed">
                {t(`${key}.a`)}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
