import { useTranslations } from "next-intl";
import { Check, X } from "lucide-react";

const ROW_KEYS = ["row_01", "row_02", "row_03", "row_04", "row_05"] as const;

export function PricingComparison() {
  const t = useTranslations("pricing.comparison");

  return (
    <div className="rounded-[22px] border border-border bg-card overflow-hidden mb-10 lg:mb-14">
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
        <div className="px-5 py-4 md:px-8 md:py-5 bg-muted/40">
          <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-muted-foreground">
            {t("without")}
          </div>
        </div>
        <div className="px-5 py-4 md:px-8 md:py-5">
          <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-amber-600 dark:text-amber-500">
            {t("with")}
          </div>
        </div>
      </div>
      <div className="divide-y divide-border">
        {ROW_KEYS.map((key) => (
          <div
            key={key}
            className="grid grid-cols-1 md:grid-cols-2 md:divide-x divide-border"
          >
            <div className="flex items-start gap-3 px-5 py-3.5 md:px-8 md:py-4 bg-muted/20">
              <X className="w-4 h-4 text-muted-foreground/70 shrink-0 mt-0.5" aria-hidden />
              <p className="text-[13px] text-muted-foreground leading-snug">
                {t(`${key}.pain`)}
              </p>
            </div>
            <div className="flex items-start gap-3 px-5 py-3.5 md:px-8 md:py-4">
              <Check
                className="w-4 h-4 text-emerald-600 dark:text-emerald-500 shrink-0 mt-0.5"
                aria-hidden
              />
              <p className="text-[13px] text-foreground leading-snug">
                {t(`${key}.fix`)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
