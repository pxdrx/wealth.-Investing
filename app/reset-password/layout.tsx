import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Redefinir senha — wealth.Investing",
  description: "Crie uma nova senha para acessar sua conta na wealth.Investing.",
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
