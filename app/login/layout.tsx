import type { Metadata } from "next";
import { cookies } from "next/headers";
import { IntlProviderSafe } from "@/components/i18n/IntlProviderSafe";
import { locales, defaultLocale, type Locale } from "@/i18n";
import ptMessages from "@/messages/pt.json";
import enMessages from "@/messages/en.json";

const MESSAGES: Record<Locale, typeof ptMessages> = {
  pt: ptMessages,
  en: enMessages as typeof ptMessages,
};

function resolveLocale(cookieVal: string | undefined): Locale {
  if (cookieVal && (locales as readonly string[]).includes(cookieVal)) {
    return cookieVal as Locale;
  }
  return defaultLocale;
}

export const metadata: Metadata = {
  title: "Login — wealth.Investing",
  description:
    "Acesse sua conta na wealth.Investing. Gerencie operações, analise padrões e evolua como trader com dados reais.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies();
  const locale = resolveLocale(cookieStore.get("NEXT_LOCALE")?.value);
  const messages = MESSAGES[locale] ?? MESSAGES[defaultLocale];
  return (
    <IntlProviderSafe locale={locale} messages={messages}>
      {children}
    </IntlProviderSafe>
  );
}
