import { TRUST_PLATFORMS } from "@/lib/landing-data";
import { AnimatedSection } from "./AnimatedSection";

export function TrustBar() {
  return (
    <section
      className="py-12 md:py-16 border-y"
      style={{ borderColor: "hsl(var(--landing-border))" }}
      aria-label="Plataformas compatíveis"
    >
      <AnimatedSection className="landing-container">
        <p className="text-center text-sm text-l-text-muted mb-8">
          Compatível com as principais plataformas e corretoras
        </p>

        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 md:gap-x-12">
          {TRUST_PLATFORMS.map((name) => (
            <span
              key={name}
              className="font-mono text-xs md:text-sm tracking-wider uppercase text-l-text-muted/60 hover:text-l-text-muted transition-colors"
            >
              {name}
            </span>
          ))}
        </div>

        <div className="mt-8 flex items-center justify-center gap-1.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <svg
              key={star}
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill={star <= 4 ? "hsl(var(--landing-accent-warning))" : "none"}
              stroke="hsl(var(--landing-accent-warning))"
              strokeWidth="1.5"
            >
              <path d="M10 1l2.39 4.84L18 6.71l-4 3.9.94 5.51L10 13.47l-4.94 2.65L6 10.61l-4-3.9 5.61-.87L10 1z" />
            </svg>
          ))}
          <span className="ml-2 font-mono text-xs text-l-text-muted">
            4.8/5 [PLACEHOLDER]
          </span>
        </div>
      </AnimatedSection>
    </section>
  );
}
