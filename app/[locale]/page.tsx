import { setRequestLocale } from "next-intl/server";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { TrustBar } from "@/components/landing/TrustBar";
import { BentoFeatures } from "@/components/landing/BentoFeatures";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { PricingSummary } from "@/components/landing/PricingSummary";
import { Footer } from "@/components/landing/Footer";

interface LandingPageProps {
  params: { locale: string };
}

export default function LandingPage({ params: { locale } }: LandingPageProps) {
  setRequestLocale(locale);

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:p-4"
      >
        Pular para o conteúdo
      </a>
      <Navbar />
      <main id="main-content">
        <Hero />
        <TrustBar />
        <BentoFeatures />
        <HowItWorks />
        <PricingSummary />
      </main>
      <Footer />
    </div>
  );
}
