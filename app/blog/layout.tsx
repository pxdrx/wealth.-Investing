import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog — wealth.Investing",
  description:
    "Artigos sobre trading, gestão de risco, psicologia do trader e análise de mercado. Conteúdo para traders que querem consistência.",
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
