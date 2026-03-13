import { AnimatedSection } from "./AnimatedSection";
import { TESTIMONIAL } from "@/lib/landing-data";

export function Testimonial() {
  return (
    <section className="landing-section" aria-label="Depoimento">
      <AnimatedSection className="landing-container">
        <div className="mx-auto max-w-3xl text-center">
          <blockquote className="text-lg md:text-xl lg:text-2xl leading-relaxed text-l-text font-medium mb-8">
            &ldquo;{TESTIMONIAL.quote}&rdquo;
          </blockquote>
          <div className="flex items-center justify-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full font-mono text-xs font-bold" style={{ backgroundColor: "hsl(var(--landing-bg-tertiary))", color: "hsl(var(--landing-text-secondary))" }}>
              {TESTIMONIAL.initials}
            </div>
            <div className="text-left">
              <div className="font-mono text-xs tracking-wider text-l-text font-semibold">{TESTIMONIAL.name}</div>
              <div className="text-xs text-l-text-muted">{TESTIMONIAL.role}</div>
            </div>
          </div>
          {TESTIMONIAL.placeholder && (
            <p className="mt-4 text-[10px] text-l-text-muted/50 font-mono">[PLACEHOLDER]</p>
          )}
        </div>
      </AnimatedSection>
    </section>
  );
}
