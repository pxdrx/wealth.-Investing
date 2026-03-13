"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { NAV_LINKS } from "@/lib/landing-data";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav
      className="sticky top-0 z-50 border-b"
      style={{
        backgroundColor: "hsl(var(--landing-bg) / 0.8)",
        borderColor: "hsl(var(--landing-border))",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <div className="landing-container flex h-16 items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2.5">
          <Logo size={28} />
          <span className="text-base font-semibold tracking-tight text-l-text">
            wealth
            <span style={{ color: "hsl(var(--landing-accent))" }}>.</span>
            <span className="font-normal text-l-text-secondary">Investing</span>
          </span>
        </a>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="px-3.5 py-2 text-sm text-l-text-secondary hover:text-l-text transition-colors rounded-lg"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          <a
            href="/login"
            className="hidden md:inline-flex px-4 py-2 text-sm text-l-text-secondary hover:text-l-text transition-colors"
          >
            Entrar
          </a>
          <a
            href="/login"
            className="hidden md:inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all hover:scale-[1.02]"
            style={{
              backgroundColor: "hsl(var(--landing-accent))",
              color: "hsl(var(--landing-bg))",
            }}
          >
            Comece grátis
          </a>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg"
            aria-label="Menu"
          >
            {mobileOpen ? (
              <X className="h-5 w-5 text-l-text" />
            ) : (
              <Menu className="h-5 w-5 text-l-text" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t md:hidden"
            style={{
              backgroundColor: "hsl(var(--landing-bg))",
              borderColor: "hsl(var(--landing-border))",
            }}
          >
            <div className="flex flex-col gap-1 p-4">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="px-3 py-2.5 text-sm text-l-text-secondary hover:text-l-text rounded-lg"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <hr
                className="my-2"
                style={{ borderColor: "hsl(var(--landing-border))" }}
              />
              <a
                href="/login"
                className="px-3 py-2.5 text-sm text-l-text-secondary"
              >
                Entrar
              </a>
              <a
                href="/login"
                className="mt-1 flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium"
                style={{
                  backgroundColor: "hsl(var(--landing-accent))",
                  color: "hsl(var(--landing-bg))",
                }}
              >
                Comece grátis
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
