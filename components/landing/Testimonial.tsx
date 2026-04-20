import { useTranslations } from "next-intl";

type Slot = {
  id: "01" | "02" | "03";
  initials: string;
  gradient: string;
};

// PLACEHOLDER QUOTES — do not ship to prod without real testimonials.
// Replace each slot's quote/handle/metric with real data in messages/{pt,en}.json,
// then flip data-placeholder="false" (or remove the attribute) on the card.
const SLOTS: Slot[] = [
  { id: "01", initials: "A1", gradient: "from-violet-500 to-violet-700" },
  { id: "02", initials: "A2", gradient: "from-emerald-500 to-emerald-700" },
  { id: "03", initials: "A3", gradient: "from-blue-500 to-blue-700" },
];

export function Testimonial() {
  const t = useTranslations("testimonials");

  return (
    <section className="py-20 lg:py-28 border-t border-border/60">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 max-w-2xl">
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-mono mb-3">
            {t("eyebrow")}
          </div>
          <h2 className="text-[28px] sm:text-[36px] lg:text-[44px] font-semibold leading-[1.1] tracking-tight text-foreground">
            {t("heading")}{" "}
            <span className="text-muted-foreground italic font-normal">{t("headingAccent")}</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
          {SLOTS.map((s) => (
            <figure
              key={s.id}
              data-placeholder="true"
              className="relative rounded-[22px] border border-dashed border-border bg-card p-6 sm:p-7 flex flex-col"
            >
              <span className="absolute top-4 right-4 text-[9px] uppercase tracking-[0.18em] font-mono text-muted-foreground/70">
                {t("placeholderLabel")}
              </span>
              <blockquote className="text-[15px] leading-relaxed text-foreground/90 flex-1">
                “{t(`slot_${s.id}.quote`)}”
              </blockquote>
              <div className="mt-6 pt-5 border-t border-border/60 flex items-center gap-3">
                <div
                  className={
                    "w-10 h-10 shrink-0 rounded-full bg-gradient-to-br text-white flex items-center justify-center text-[12px] font-semibold " +
                    s.gradient
                  }
                  aria-hidden
                >
                  {s.initials}
                </div>
                <figcaption className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-foreground truncate">
                    {t(`slot_${s.id}.name`)}
                  </div>
                  <div className="text-[11px] text-muted-foreground font-mono truncate">
                    {t(`slot_${s.id}.handle`)}
                  </div>
                </figcaption>
                <div className="text-right shrink-0">
                  <div className="text-[13px] font-semibold text-emerald-600 dark:text-emerald-500">
                    {t(`slot_${s.id}.metric`)}
                  </div>
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                    {t(`slot_${s.id}.metricLabel`)}
                  </div>
                </div>
              </div>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
