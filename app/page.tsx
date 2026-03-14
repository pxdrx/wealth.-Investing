import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { TrustBar } from "@/components/landing/TrustBar";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { FeatureSection } from "@/components/landing/FeatureSection";
import {
  VisualRegistre,
  VisualAnalise,
  VisualEvolua,
  VisualProteja,
} from "@/components/landing/FeatureVisuals";
import { AIAssistant } from "@/components/landing/AIAssistant";
import { MacroIntelligence } from "@/components/landing/MacroIntelligence";
import { Testimonial } from "@/components/landing/Testimonial";
import { CTASection } from "@/components/landing/CTASection";
import { EnterpriseTrust } from "@/components/landing/EnterpriseTrust";
import { Footer } from "@/components/landing/Footer";
import { FEATURES, CTA_FINAL } from "@/lib/landing-data";

const VISUALS = [
  <VisualRegistre key="v1" />,
  <VisualAnalise key="v2" />,
  <VisualEvolua key="v3" />,
  <VisualProteja key="v4" />,
];

export default function LandingPage() {
  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "hsl(var(--landing-bg))" }}
    >
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
        <HowItWorks />

        {FEATURES.map((feat, i) => (
          <FeatureSection
            key={feat.number}
            data={feat}
            reversed={i % 2 !== 0}
            visual={VISUALS[i]}
          />
        ))}

        <AIAssistant />
        <MacroIntelligence />
        <Testimonial />
        <EnterpriseTrust />

        <CTASection
          headline={CTA_FINAL.headline}
          ctaPrimary={CTA_FINAL.ctaPrimary}
        />
      </main>

      <Footer />
    </div>
  );
}
