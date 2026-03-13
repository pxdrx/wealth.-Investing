import { ArrowRight } from "lucide-react";
import { AnimatedSection } from "./AnimatedSection";
const BLOG_POSTS = [
  { tag: "analytics", title: "Como usar o profit factor para identificar se seu setup realmente funciona", href: "#" },
  { tag: "gestão de risco", title: "O guia definitivo de drawdown: como proteger seu capital e sua mente", href: "#" },
  { tag: "journal", title: "Por que os melhores traders do mundo mantêm um diário de operações", href: "#" },
];

export function BlogContent() {
  return (
    <section className="landing-section" aria-label="Blog">
      <div className="landing-container">
        <AnimatedSection className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-12 gap-4">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tighter-apple text-l-text">
            Conteúdo que acelera sua evolução
          </h2>
          <a
            href="#"
            className="inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium text-l-text-secondary hover:text-l-text transition-colors"
            style={{ borderColor: "hsl(var(--landing-border-strong))" }}
          >
            Ver todos os artigos <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </AnimatedSection>

        <div className="grid gap-6 md:grid-cols-3">
          {BLOG_POSTS.map((post, i) => (
            <AnimatedSection key={post.title} delay={i * 0.1}>
              <a href={post.href} className="group block h-full">
                <div
                  className="h-full rounded-2xl border p-6 transition-all group-hover:-translate-y-1"
                  style={{
                    backgroundColor: "hsl(var(--landing-bg-elevated))",
                    borderColor: "hsl(var(--landing-border))",
                  }}
                >
                  {/* Image placeholder */}
                  <div
                    className="aspect-[16/9] rounded-xl mb-4"
                    style={{
                      backgroundColor: "hsl(var(--landing-bg-tertiary))",
                    }}
                  />

                  <span
                    className="inline-block font-mono text-[10px] tracking-[0.12em] uppercase mb-3 rounded-full px-2.5 py-1"
                    style={{
                      backgroundColor: "hsl(var(--landing-accent) / 0.1)",
                      color: "hsl(var(--landing-accent))",
                    }}
                  >
                    {post.tag}
                  </span>

                  <h3 className="text-sm font-semibold leading-snug text-l-text group-hover:text-l-accent transition-colors">
                    {post.title}
                  </h3>
                </div>
              </a>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
