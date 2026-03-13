import { AnimatedSection } from "./AnimatedSection";
import { GridPattern } from "./GridPattern";

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
        <a href="/login" className="inline-flex items-center justify-center rounded-lg px-7 py-3.5 text-sm font-medium transition-all hover:brightness-110" style={{ backgroundColor: "hsl(var(--landing-accent))", color: "#fff" }}>
          {ctaPrimary}
        </a>
      </AnimatedSection>
    </section>
  );
}
