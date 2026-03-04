import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { AppShell } from "@/components/layout/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "wealth. Investing",
  description: "Seu centro de comando para o mercado financeiro.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <ThemeProvider defaultTheme="light" storageKey="trading-dashboard-theme">
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
