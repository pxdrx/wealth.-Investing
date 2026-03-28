import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login — wealth.Investing",
  description:
    "Acesse sua conta na wealth.Investing. Gerencie operações, analise padrões e evolua como trader com dados reais.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
