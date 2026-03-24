"use client";

import { useEffect, useState } from "react";
import { BrandMark } from "@/components/brand/BrandMark";
import {
  FOOTER_PRODUCT_LINKS,
  FOOTER_RESOURCE_LINKS,
  FOOTER_CONTACT_LINKS,
  FOOTER_SOCIAL_LINKS,
  FOOTER_MANIFESTO,
  FOOTER_LEGAL,
} from "@/lib/landing-data";
import { supabase } from "@/lib/supabase/client";
import { LegalModals, type LegalModal } from "./LegalModals";

const LEGAL_MAP: Record<string, LegalModal> = {
  "Cookies": "cookies",
  "Privacidade": "privacy",
  "Termos de uso": "terms",
};

export function Footer() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [openModal, setOpenModal] = useState<LegalModal>(null);

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    }
    checkAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <footer
      className="border-t pt-16 pb-8"
      style={{ borderColor: "hsl(var(--landing-border))" }}
    >
      <div className="landing-container">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4 mb-16">
          {/* Column 1: Plataforma */}
          <div>
            <h4 className="font-mono text-[11px] tracking-[0.15em] uppercase text-l-text-muted mb-4">
              PLATAFORMA
            </h4>
            <ul className="space-y-2.5">
              {FOOTER_PRODUCT_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={isLoggedIn ? link.hrefAuth : link.hrefGuest}
                    className="text-sm text-l-text-secondary hover:text-l-text transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 2: Recursos */}
          <div>
            <h4 className="font-mono text-[11px] tracking-[0.15em] uppercase text-l-text-muted mb-4">
              RECURSOS
            </h4>
            <ul className="space-y-2.5">
              {FOOTER_RESOURCE_LINKS.map((link) => (
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
          </div>

          {/* Column 3: Contato + Social */}
          <div>
            <h4 className="font-mono text-[11px] tracking-[0.15em] uppercase text-l-text-muted mb-4">
              CONTATO
            </h4>
            <ul className="space-y-2.5">
              {FOOTER_CONTACT_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target={link.external ? "_blank" : undefined}
                    rel={link.external ? "noopener noreferrer" : undefined}
                    className="text-sm text-l-text-secondary hover:text-l-text transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>

            <h4 className="font-mono text-[11px] tracking-[0.15em] uppercase text-l-text-muted mt-6 mb-4">
              CONECTE
            </h4>
            <ul className="space-y-2.5">
              {FOOTER_SOCIAL_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-l-text-secondary hover:text-l-text transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Manifesto card */}
          <div>
            <a
              href={FOOTER_MANIFESTO.href}
              className="group block rounded-2xl border overflow-hidden transition-all hover:-translate-y-0.5"
              style={{
                backgroundColor: "hsl(var(--landing-bg-elevated))",
                borderColor: "hsl(var(--landing-border))",
              }}
            >
              <div className="aspect-[3/2] overflow-hidden">
                <img
                  src="/manifesto-cover.png"
                  alt="wealth.Investing Manifesto"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-6">
                <h4 className="text-sm font-semibold text-l-text mb-1">
                  {FOOTER_MANIFESTO.title}
                </h4>
                <p className="text-xs text-l-text-muted">
                  {FOOTER_MANIFESTO.subtitle}
                </p>
              </div>
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t pt-6"
          style={{ borderColor: "hsl(var(--landing-border))" }}
        >
          <div className="flex items-center gap-2.5">
            <BrandMark className="text-xs" />
            <span className="text-xs text-l-text-muted">
              © 2026
            </span>
          </div>
          <div className="flex items-center gap-4">
            {FOOTER_LEGAL.map((link) => (
              <button
                key={link.label}
                type="button"
                onClick={() => setOpenModal(LEGAL_MAP[link.label] ?? null)}
                className="text-xs text-l-text-muted hover:text-l-text-secondary transition-colors cursor-pointer"
              >
                {link.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <LegalModals open={openModal} onOpenChange={setOpenModal} />
    </footer>
  );
}
