import { Logo } from "./Logo";
import { FOOTER_COLUMNS, FOOTER_MANIFESTO, FOOTER_LEGAL } from "@/lib/landing-data";

export function Footer() {
  return (
    <footer
      className="border-t pt-16 pb-8"
      style={{ borderColor: "hsl(var(--landing-border))" }}
    >
      <div className="landing-container">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4 mb-16">
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="font-mono text-[11px] tracking-[0.15em] uppercase text-l-text-muted mb-4">
                {col.title}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-l-text-secondary hover:text-l-text transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>

              {"socialTitle" in col && col.socialTitle && (
                <>
                  <h4 className="font-mono text-[11px] tracking-[0.15em] uppercase text-l-text-muted mt-6 mb-4">
                    {col.socialTitle}
                  </h4>
                  <ul className="space-y-2.5">
                    {col.social.map((link) => (
                      <li key={link.label}>
                        <a
                          href={link.href}
                          className="text-sm text-l-text-secondary hover:text-l-text transition-colors"
                        >
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          ))}

          {/* Manifesto card */}
          <div>
            <a
              href={FOOTER_MANIFESTO.href}
              className="block rounded-2xl border p-6 transition-all hover:-translate-y-0.5"
              style={{
                backgroundColor: "hsl(var(--landing-bg-elevated))",
                borderColor: "hsl(var(--landing-border))",
              }}
            >
              <div
                className="aspect-[3/2] rounded-xl mb-4"
                style={{
                  backgroundColor: "hsl(var(--landing-bg-tertiary))",
                }}
              />
              <h4 className="text-sm font-semibold text-l-text mb-1">
                {FOOTER_MANIFESTO.title}
              </h4>
              <p className="text-xs text-l-text-muted">
                {FOOTER_MANIFESTO.subtitle}
              </p>
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t pt-6"
          style={{ borderColor: "hsl(var(--landing-border))" }}
        >
          <div className="flex items-center gap-2.5">
            <Logo size={20} />
            <span className="text-xs text-l-text-muted">
              © 2026 wealth.Investing
            </span>
          </div>
          <div className="flex items-center gap-4">
            {FOOTER_LEGAL.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-xs text-l-text-muted hover:text-l-text-secondary transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
