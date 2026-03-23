import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
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
                const resolved = theme === 'dark' ? 'dark'
                  : theme === 'light' ? 'light'
                  : prefersDark ? 'dark' : 'light';
                document.documentElement.classList.add(resolved);
              } catch {}
            `,
          }}
        />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body
        className={`${inter.variable} ${jetbrains.variable} ${jakarta.variable} relative min-h-screen font-sans antialiased`}
      >
        <ThemeProvider defaultTheme="dark" storageKey="trading-dashboard-theme">
          {/* Premium Ambient Background (Forces Glassmorphism to pop) */}
          <div className="fixed inset-0 z-0 pointer-events-none bg-background">
            <div className="absolute top-[-30%] left-[-10%] w-[70vw] h-[70vw] rounded-full bg-blue-500/10 dark:bg-blue-600/20 blur-[140px] mix-blend-screen animate-pulse duration-[15000ms]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 blur-[120px] mix-blend-screen" />
            <div className="absolute top-[20%] left-[60%] w-[40vw] h-[40vw] rounded-full bg-purple-500/5 dark:bg-indigo-500/10 blur-[100px] mix-blend-screen" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
          </div>
          <div className="relative z-[1] flex flex-col min-h-screen">
            <AppShell>{children}</AppShell>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
