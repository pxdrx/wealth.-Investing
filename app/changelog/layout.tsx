import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Changelog — wealth.Investing",
  description:
    "Acompanhe todas as novidades e atualizações da plataforma wealth.Investing. Novas funcionalidades, melhorias e correções.",
};

export default function ChangelogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
