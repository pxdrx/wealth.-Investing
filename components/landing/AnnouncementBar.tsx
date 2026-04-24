"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { X, ArrowRight } from "lucide-react";
import { ANNOUNCEMENT } from "@/lib/landing-data";

export function AnnouncementBar() {
  const t = useTranslations("announcement");
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  return (
    <div
      className="relative flex items-center justify-center gap-3 px-4 py-2.5 text-xs font-medium"
      style={{
        backgroundColor: "hsl(var(--landing-text))",
        color: "hsl(var(--landing-bg))",
      }}
    >
      <a href={ANNOUNCEMENT.href} className="flex items-center gap-2 tracking-wide hover:opacity-80 transition-opacity">
        <span>{t("text")}</span>
        <ArrowRight className="h-3.5 w-3.5" />
      </a>
      <button onClick={() => setVisible(false)} className="absolute right-3 p-1 rounded-full hover:opacity-60 transition-opacity" aria-label={t("dismissAria")}>
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
