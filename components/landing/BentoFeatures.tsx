import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

type CellKey = "01" | "02" | "03" | "04";

function Numeral({ n }: { n: CellKey }) {
  return (
    <div className="text-[11px] tracking-[0.18em] font-mono text-amber-600 dark:text-amber-500">
      {n}
    </div>
  );
}

function JournalVisual() {
  const rows = [
    { sym: "EURUSD", size: "0.50", pnl: "+$234", pos: true },
    { sym: "XAUUSD", size: "1.20", pnl: "-$89", pos: false },
    { sym: "NAS100", size: "2.00", pnl: "+$456", pos: true },
    { sym: "GBPJPY", size: "0.30", pnl: "+$128", pos: true },
  ];
  return (
    <div className="mt-6 rounded-xl border border-border bg-muted/30 p-3 font-mono text-[11px]">
      {rows.map((r, i) => (
        <div
          key={r.sym + i}
          className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0"
        >
          <span className="text-foreground">{r.sym}</span>
          <span className="text-muted-foreground">{r.size}</span>
          <span
            className={
              "font-semibold " + (r.pos ? "text-emerald-600 dark:text-emerald-400" : "text-red-500")
            }
          >
            {r.pnl}
          </span>
        </div>
      ))}
    </div>
  );
}

function DexterVisual({ quote }: { quote: string }) {
  return (
    <div className="mt-6 flex gap-2.5">
      <div className="w-7 h-7 shrink-0 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 text-white flex items-center justify-center text-[11px] font-semibold">
        D
      </div>
      <div className="flex-1 rounded-2xl rounded-tl-sm border border-border bg-muted/30 px-3 py-2.5 text-[12px] text-foreground leading-snug">
        {quote}
      </div>
    </div>
  );
}

function MacroVisual({ labels }: { labels: { cpi: string; ecb: string; nfp: string } }) {
  const events = [
    { time: "14:30", flag: "🇺🇸", name: labels.cpi },
    { time: "15:45", flag: "🇪🇺", name: labels.ecb },
    { time: "19:30", flag: "🇺🇸", name: labels.nfp },
  ];
  return (
    <div className="mt-6 rounded-xl border border-border bg-muted/30 divide-y divide-border/40">
      {events.map((e) => (
        <div key={e.name} className="flex items-center justify-between px-3 py-2 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="font-mono text-foreground">{e.time}</span>
            <span className="text-base leading-none">{e.flag}</span>
            <span className="text-foreground">{e.name}</span>
          </div>
          <span className="w-2 h-2 rounded-full bg-red-500" aria-hidden />
        </div>
      ))}
    </div>
  );
}

function PropVisual({ labels }: { labels: { dd: string; pt: string } }) {
  const bars = [
    { label: labels.dd, left: "-2.1%", right: "-5.0%", pct: 42, tone: "red" as const },
    { label: labels.pt, left: "+6.2%", right: "+8.0%", pct: 77, tone: "green" as const },
  ];
  return (
    <div className="mt-6 space-y-3">
      {bars.map((b) => (
        <div key={b.label}>
          <div className="flex justify-between text-[11px] mb-1">
            <span className="text-muted-foreground">{b.label}</span>
            <span className="font-mono">
              <span
                className={
                  "font-semibold " +
                  (b.tone === "red" ? "text-red-500" : "text-emerald-600 dark:text-emerald-400")
                }
              >
                {b.left}
              </span>
              <span className="text-muted-foreground"> / {b.right}</span>
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={
                "h-full rounded-full " + (b.tone === "red" ? "bg-red-500" : "bg-emerald-500")
              }
              style={{ width: `${b.pct}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function Cell({
  numeral,
  label,
  manifest,
  visual,
}: {
  numeral: CellKey;
  label: string;
  manifest: string;
  visual: ReactNode;
}) {
  return (
    <div className="rounded-[22px] border border-border bg-card p-6 sm:p-8 flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <Numeral n={numeral} />
        <span className="text-[12px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
          {label}
        </span>
      </div>
      <p className="text-[20px] sm:text-[22px] lg:text-[24px] font-semibold leading-[1.25] tracking-tight text-foreground">
        {manifest}
      </p>
      <div className="mt-auto pt-2">{visual}</div>
    </div>
  );
}

export function BentoFeatures() {
  const t = useTranslations("bento");

  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-12 lg:mb-16 max-w-2xl">
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-mono mb-3">
            {t("eyebrow")}
          </div>
          <h2 className="text-[28px] sm:text-[36px] lg:text-[44px] font-semibold leading-[1.1] tracking-tight text-foreground">
            {t("heading")}{" "}
            <span className="text-muted-foreground italic font-normal">{t("headingAccent")}</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
          <Cell
            numeral="01"
            label={t("cell_01.label")}
            manifest={t("cell_01.manifest")}
            visual={<JournalVisual />}
          />
          <Cell
            numeral="02"
            label={t("cell_02.label")}
            manifest={t("cell_02.manifest")}
            visual={<DexterVisual quote={t("cell_02.visualQuote")} />}
          />
          <Cell
            numeral="03"
            label={t("cell_03.label")}
            manifest={t("cell_03.manifest")}
            visual={
              <MacroVisual
                labels={{
                  cpi: t("cell_03.visualCpi"),
                  ecb: t("cell_03.visualEcb"),
                  nfp: t("cell_03.visualNfp"),
                }}
              />
            }
          />
          <Cell
            numeral="04"
            label={t("cell_04.label")}
            manifest={t("cell_04.manifest")}
            visual={
              <PropVisual
                labels={{
                  dd: t("cell_04.visualDd"),
                  pt: t("cell_04.visualPt"),
                }}
              />
            }
          />
        </div>
      </div>
    </section>
  );
}
