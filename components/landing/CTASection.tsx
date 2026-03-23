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
        <h2 className="mx-auto max-w-2xl text-2xl sm:text-3xl md:text-4xl font-headline font-extrabold tracking-tight text-l-text mb-8">
          {headline}
        </h2>
        <a href="/login" className="inline-flex items-center justify-center gap-2 bg-[#1A1A1A] text-white text-base font-semibold px-10 py-5 min-w-[200px] rounded-full hover:bg-black transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-[0_8px_24px_rgba(26,26,26,0.12)]">
          {ctaPrimary}
        </a>
      </AnimatedSection>
    </section>
  );
}
