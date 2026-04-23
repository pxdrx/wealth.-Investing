import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { AuthGate } from "@/components/auth/AuthGate";
import { BootstrapWarning } from "@/components/auth/BootstrapWarning";
import { PrivacyProvider } from "@/components/context/PrivacyContext";
import { locales, defaultLocale, type Locale } from "@/i18n";
import ptMessages from "@/messages/pt.json";
import enMessages from "@/messages/en.json";

const MESSAGES: Record<Locale, typeof ptMessages> = {
  pt: ptMessages,
  en: enMessages as typeof ptMessages,
};

// PT is default. EN only when user explicitly chose it (cookie). No
// Accept-Language sniffing — matches landing middleware behavior.
function resolveLocale(cookieVal: string | undefined): Locale {
  if (cookieVal && (locales as readonly string[]).includes(cookieVal)) {
    return cookieVal as Locale;
  }
  return defaultLocale;
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies();
  const locale = resolveLocale(cookieStore.get("NEXT_LOCALE")?.value);
  const messages = MESSAGES[locale] ?? MESSAGES[defaultLocale];
  const tCommon = await getTranslations({ locale, namespace: "app.common" });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <AuthGate>
        <PrivacyProvider>
          <div className="min-h-screen">
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-background focus:px-4 focus:py-2 focus:rounded-md focus:text-foreground focus:ring-2 focus:ring-ring"
            >
              {tCommon("skipToContent")}
            </a>
            <BootstrapWarning />
            <main id="main-content">
              {children}
            </main>
          </div>
        </PrivacyProvider>
      </AuthGate>
    </NextIntlClientProvider>
  );
}
