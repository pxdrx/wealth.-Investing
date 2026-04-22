import { cookies, headers } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
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

function resolveLocale(cookieVal: string | undefined, acceptLang: string | null): Locale {
  if (cookieVal && (locales as readonly string[]).includes(cookieVal)) {
    return cookieVal as Locale;
  }
  if (acceptLang) {
    const preferred = acceptLang.split(",")[0]?.split("-")[0]?.toLowerCase();
    if (preferred && (locales as readonly string[]).includes(preferred)) {
      return preferred as Locale;
    }
  }
  return defaultLocale;
}

function lookupFallback(path: string): string {
  const parts = path.split(".");
  let cursor: unknown = ptMessages;
  for (const part of parts) {
    if (cursor && typeof cursor === "object" && part in (cursor as Record<string, unknown>)) {
      cursor = (cursor as Record<string, unknown>)[part];
    } else {
      return path;
    }
  }
  return typeof cursor === "string" ? cursor : path;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  // The i18n middleware only covers public landing routes, so /app/** needs
  // its own provider. Locale is read from the NEXT_LOCALE cookie (set by the
  // LocaleSwitcher) with an Accept-Language fallback. Messages are imported
  // statically so webpack can tree-shake / ship them in the server bundle.
  const cookieStore = cookies();
  const headerStore = headers();
  const locale = resolveLocale(
    cookieStore.get("NEXT_LOCALE")?.value,
    headerStore.get("accept-language"),
  );
  const messages = MESSAGES[locale] ?? MESSAGES[defaultLocale];

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      onError={(error) => {
        if (error.code === "MISSING_MESSAGE") {
          if (process.env.NODE_ENV !== "production") {
            console.warn(`[i18n] missing ${locale} key — falling back to ${defaultLocale}`, error.message);
          }
          return;
        }
        throw error;
      }}
      getMessageFallback={({ namespace, key }) => {
        const path = namespace ? `${namespace}.${key}` : key;
        return lookupFallback(path);
      }}
    >
      <AuthGate>
        <PrivacyProvider>
          <div className="min-h-screen">
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-background focus:px-4 focus:py-2 focus:rounded-md focus:text-foreground focus:ring-2 focus:ring-ring"
            >
              Pular para o conteúdo
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
