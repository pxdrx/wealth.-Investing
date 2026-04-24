import type { Metadata } from "next";
import { getMessages, setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n";
import { IntlProviderSafe } from "@/components/i18n/IntlProviderSafe";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

// html/body live in the root app/layout.tsx. When B-12 migrates public routes
// into [locale], the root layout will move here and emit <html lang={locale}>.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://owealthinvesting.com";

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const { locale } = params;
  if (!(routing.locales as readonly string[]).includes(locale)) return {};

  const t = await getTranslations({ locale, namespace: "seo" });

  const localePath = locale === routing.defaultLocale ? "" : `/${locale}`;
  const url = `${SITE_URL}${localePath || "/"}`;

  const languages: Record<string, string> = {};
  for (const l of routing.locales) {
    languages[l] = l === routing.defaultLocale ? `${SITE_URL}/` : `${SITE_URL}/${l}`;
  }
  languages["x-default"] = `${SITE_URL}/`;

  return {
    metadataBase: new URL(SITE_URL),
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: url,
      languages,
    },
    openGraph: {
      type: "website",
      url,
      siteName: "wealth.Investing",
      title: t("title"),
      description: t("description"),
      locale: locale === "pt" ? "pt_BR" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
      creator: "@owealth_inv",
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const { locale } = params;
  if (!(routing.locales as readonly string[]).includes(locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <IntlProviderSafe locale={locale} messages={messages}>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </IntlProviderSafe>
  );
}
