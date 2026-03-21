import { AnimatedSection } from "./AnimatedSection";
import { GridPattern } from "./GridPattern";
import { LiquidButton } from "@/components/ui/liquid-glass-button";

interface CTASectionProps {
  headline: string;
  ctaPrimary: string;
}

export function CTASection({ headline, ctaPrimary }: CTASectionProps) {
  return (
    <section className="relative landing-section overflow-hidden" aria-label="CTA">
      <GridPattern className="opacity-30" />
      <AnimatedSection className="landing-container relative z-10 text-center">
        <h2 className="mx-auto max-w-2xl text-2xl sm:text-3xl md:text-4xl font-bold tracking-tighter-apple text-l-text mb-8">
          {headline}
        </h2>
        <LiquidButton href="/login" size="xxl" className="text-base font-semibold px-10 py-6 min-w-[200px]">
          {ctaPrimary}
        </LiquidButton>
      </AnimatedSection>
    </section>
  );
}
