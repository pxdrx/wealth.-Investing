import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manifesto — wealth.Investing",
  description:
    "Nosso manifesto: consistência, disciplina e evolução baseada em dados. Conheça a filosofia por trás da wealth.Investing.",
};

export default function ManifestoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
