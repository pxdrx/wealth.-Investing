import { useFormatter, useTranslations } from "next-intl";

type Props = {
  totalTrades: number | null;
  activeTraders30d: number | null;
  totalVolumeUsd: number | null;
};

export function SocialProof({ totalTrades, activeTraders30d, totalVolumeUsd }: Props) {
  const t = useTranslations("socialProof");
  const f = useFormatter();

  const parts: string[] = [];
  if (totalTrades != null) {
    parts.push(t("trades", { n: f.number(totalTrades) }));
  }
  if (activeTraders30d != null) {
    parts.push(t("activeTraders", { n: f.number(activeTraders30d) }));
  }
  if (totalVolumeUsd != null) {
    const volume = f.number(totalVolumeUsd, {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    });
    parts.push(t("volume", { n: volume }));
  }

  if (parts.length === 0) return null;

  return (
    <p className="mt-8 text-xs text-muted-foreground font-mono tracking-tight">
      {parts.join(" · ")}
    </p>
  );
}
