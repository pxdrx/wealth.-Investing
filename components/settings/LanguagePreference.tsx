"use client";

// [H1] Settings > Preferências language switcher.
//
// Was previously mounted in the AppSidebar footer next to ThemeToggle.
// Per closeout sprint mandate H1, the PT/EN toggle now lives in Settings,
// keeping the sidebar focused on navigation. DB-backed persistence
// (`profiles.preferred_locale`) and cookie sync remain handled inside
// `LocaleSwitcher` itself — this wrapper is purely presentational.

import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";
import { useAppT } from "@/hooks/useAppLocale";

export function LanguagePreference() {
  const t = useAppT();
  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-muted-foreground">{t("settings.preferences.language")}</span>
      <LocaleSwitcher />
    </div>
  );
}
