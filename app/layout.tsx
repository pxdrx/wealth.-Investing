import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { AppShell } from "@/components/layout/AppShell";
import { BGPattern } from "@/components/ui/bg-pattern";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "wealth.Investing — Consistência baseada em dados para traders",
  description:
    "Plataforma de analytics, journaling e gestão de risco para traders que querem consistência, controle e evolução baseada em dados reais.",
  openGraph: {
    title: "wealth.Investing — Consistência baseada em dados para traders",
    description:
      "Centralize operações, analise padrões e transforme dados em insights acionáveis para operar com disciplina.",
    type: "website",
    locale: "pt_BR",
  },
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
                const resolved = theme === 'dark' || (!theme && prefersDark) ? 'dark' : 'light';
                document.documentElement.classList.add(resolved);
              } catch {}
            `,
          }}
        />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body
        className={`${inter.variable} ${jetbrains.variable} relative min-h-screen font-sans antialiased`}
      >
        <BGPattern
          variant="dots"
          mask="fade-center"
          size={24}
          fill="currentColor"
          className="pointer-events-none fixed inset-0 w-full h-full opacity-[0.15] dark:opacity-[0.2] text-foreground !z-0"
        />
        <ThemeProvider defaultTheme="dark" storageKey="trading-dashboard-theme">
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
