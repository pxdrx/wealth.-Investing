import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Plus_Jakarta_Sans, Manrope } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "@/components/theme-provider";
import { AppShell } from "@/components/layout/AppShell";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "wealth.Investing — Domine o Mercado com Dados e Inteligência Artificial",
  description:
    "A primeira plataforma all-in-one para traders. Analytics avançado, IA preditiva e inteligência de mercado em tempo real. Opere com vantagem institucional.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    title: "wealth.Investing — Domine o Mercado com Dados e IA",
    description:
      "A primeira plataforma all-in-one para traders. Analytics avançado, IA preditiva e inteligência de mercado em tempo real. Descubra sua verdadeira vantagem.",
    type: "website",
    locale: "pt_BR",
    siteName: "wealth.Investing",
    url: "https://owealthinvesting.com",
    images: [
      {
        url: "https://owealthinvesting.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "wealth.Investing — Plataforma de trading analytics",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "wealth.Investing — Domine o Mercado com Dados e IA",
    description: "Analytics avançado, IA preditiva e inteligência de mercado em tempo real. Opere como uma instituição.",
    images: ["https://owealthinvesting.com/og-image.png"],
    creator: "@owealth_inv",
  },
};

export const viewport: Viewport = {
  themeColor: "#2DB469",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('trading-dashboard-theme');
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                const resolved = theme === 'dark' ? 'dark'
                  : theme === 'light' ? 'light'
                  : prefersDark ? 'dark' : 'light';
                document.documentElement.classList.add(resolved);
              } catch {}
            `,
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${jetbrains.variable} ${jakarta.variable} ${manrope.variable} relative min-h-screen font-sans antialiased`}
      >
        <ThemeProvider defaultTheme="light" storageKey="trading-dashboard-theme">
          {/* Authentic Lumina Slate Background (Clean, Institutional) */}
          <div className="fixed inset-0 z-0 pointer-events-none bg-background">
            <div className="absolute inset-0 bg-[radial-gradient(#D4D2CB_1px,transparent_1px)] dark:bg-[radial-gradient(#333333_1px,transparent_1px)] bg-[size:24px_24px] opacity-70 [mask-image:radial-gradient(ellipse_80%_80%_at_50%_0%,#000_100%,transparent_100%)]" />
          </div>
          <div className="relative z-[1] flex flex-col min-h-screen">
            <AppShell>{children}</AppShell>
          </div>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
