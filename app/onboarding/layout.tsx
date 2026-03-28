import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Onboarding — wealth.Investing",
  description:
    "Configure sua conta na wealth.Investing. Personalize seu perfil e comece a registrar suas operações.",
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
