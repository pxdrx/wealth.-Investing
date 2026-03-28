"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { AnimatedSection } from "@/components/landing/AnimatedSection";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import type { FeaturePageData } from "./feature-page-data";

interface FeaturePageClientProps {
  feature: FeaturePageData;
  prevSlug: string | null;
  nextSlug: string | null;
  prevTag: string | null;
  nextTag: string | null;
}

export function FeaturePageClient({
  feature,
  prevSlug,
  nextSlug,
  prevTag,
  nextTag,
}: FeaturePageClientProps) {
  const mockupRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "hsl(var(--landing-bg))" }}
    >
      <Navbar />

      {/* ── Hero ── */}
      <section className="landing-section !pb-12 md:!pb-16">
        <div className="landing-container">
          <AnimatedSection>
            <Link
              href="/#recursos"
              className="inline-flex items-center gap-1.5 text-sm text-l-text-muted hover:text-l-text transition-colors mb-8"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar para recursos
            </Link>
          </AnimatedSection>

          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <AnimatedSection>
              <span
                className="inline-block font-mono text-xs tracking-[0.15em] uppercase mb-4 px-3 py-1 rounded-full"
                style={{
                  backgroundColor: "hsl(var(--landing-accent) / 0.1)",
                  color: "hsl(var(--landing-accent))",
                }}
              >
                [{feature.number}] {feature.tag}
              </span>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-bold tracking-tighter-apple mb-6 text-l-text">
                {feature.headline}
              </h1>
              <p className="text-base md:text-lg leading-relaxed text-l-text-secondary max-w-xl mb-8">
                {feature.heroDescription}
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-xl px-7 py-3.5 text-sm font-medium transition-all hover:scale-[1.02] hover:brightness-110"
                  style={{
                    backgroundColor: "hsl(var(--landing-accent))",
                    color: "hsl(var(--landing-bg))",
                  }}
                >
                  {feature.ctaText}
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-xl px-7 py-3.5 text-sm font-medium border transition-all hover:scale-[1.01]"
                  style={{
                    borderColor: "hsl(var(--landing-border-strong))",
                    color: "hsl(var(--landing-text-secondary))",
                  }}
                >
                  Já tem conta? Faça login
                </Link>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={0.15}>
              <div ref={mockupRef}>{feature.heroMockup}</div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ── Stats banner ── */}
      <section className="py-6">
        <div className="landing-container">
          <AnimatedSection>
            <div
              className="rounded-2xl border px-6 py-5 md:px-10 md:py-6 flex flex-col md:flex-row items-center justify-center gap-2 md:gap-3 text-center"
              style={{
                backgroundColor: "hsl(var(--landing-accent) / 0.05)",
                borderColor: "hsl(var(--landing-accent) / 0.15)",
              }}
            >
              <span
                className="text-2xl md:text-3xl font-bold font-mono"
                style={{ color: "hsl(var(--landing-accent))" }}
              >
                {feature.statValue}
              </span>
              <span className="text-sm md:text-base text-l-text-secondary">
                {feature.statLabel}
              </span>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── Benefits cards ── */}
      <section className="landing-section">
        <div className="landing-container">
          <AnimatedSection>
            <div className="text-center mb-12 md:mb-16">
              <span className="font-mono text-xs tracking-[0.15em] uppercase text-l-text-muted mb-3 block">
                BENEFÍCIOS
              </span>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-l-text">
                {feature.benefitsHeadline}
              </h2>
            </div>
          </AnimatedSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {feature.benefits.map((benefit, i) => (
              <AnimatedSection key={benefit.title} delay={i * 0.08}>
                <div
                  className="landing-card landing-card-hover p-6 h-full flex flex-col"
                >
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center mb-4"
                    style={{
                      backgroundColor: "hsl(var(--landing-accent) / 0.1)",
                    }}
                  >
                    {benefit.icon}
                  </div>
                  <h3 className="text-base font-semibold text-l-text mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-l-text-muted flex-1">
                    {benefit.description}
                  </p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section
        className="landing-section"
        style={{ backgroundColor: "hsl(var(--landing-bg-tertiary))" }}
      >
        <div className="landing-container">
          <AnimatedSection>
            <div className="text-center mb-12 md:mb-16">
              <span className="font-mono text-xs tracking-[0.15em] uppercase text-l-text-muted mb-3 block">
                COMO FUNCIONA
              </span>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-l-text">
                {feature.howItWorksTitle}
              </h2>
            </div>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-8 md:gap-6">
            {feature.steps.map((step, i) => (
              <AnimatedSection key={step.title} delay={i * 0.12}>
                <div className="relative text-center md:text-left">
                  <div
                    className="inline-flex h-12 w-12 items-center justify-center rounded-2xl font-mono text-lg font-bold mb-4"
                    style={{
                      backgroundColor: "hsl(var(--landing-accent) / 0.1)",
                      color: "hsl(var(--landing-accent))",
                    }}
                  >
                    {i + 1}
                  </div>
                  {/* Connector line (desktop only) */}
                  {i < feature.steps.length - 1 && (
                    <div
                      className="hidden md:block absolute top-6 left-[calc(50%+32px)] w-[calc(100%-64px)] h-px"
                      style={{
                        backgroundColor: "hsl(var(--landing-border-strong))",
                      }}
                    />
                  )}
                  <h3 className="text-base font-semibold text-l-text mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-l-text-muted">
                    {step.description}
                  </p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature detail mockup ── */}
      <section className="landing-section">
        <div className="landing-container">
          <AnimatedSection>
            <div className="text-center mb-10 md:mb-14">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-l-text">
                {feature.mockupSectionTitle}
              </h2>
              <p className="text-sm md:text-base text-l-text-secondary mt-3 max-w-2xl mx-auto">
                {feature.mockupSectionDescription}
              </p>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.1}>
            <div
              className="rounded-2xl border overflow-hidden"
              style={{
                backgroundColor: "hsl(var(--landing-bg-elevated))",
                borderColor: "hsl(var(--landing-border))",
                boxShadow: "var(--landing-card-shadow)",
              }}
            >
              {feature.detailMockup}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── Checklist / Feature list ── */}
      <section
        className="landing-section"
        style={{ backgroundColor: "hsl(var(--landing-bg-tertiary))" }}
      >
        <div className="landing-container">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <AnimatedSection>
              <span className="font-mono text-xs tracking-[0.15em] uppercase text-l-text-muted mb-3 block">
                TUDO INCLUÍDO
              </span>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-l-text mb-6">
                {feature.checklistTitle}
              </h2>
              <ul className="space-y-3">
                {feature.checklist.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-sm text-l-text-secondary"
                  >
                    <div
                      className="mt-0.5 h-5 w-5 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: "hsl(var(--landing-accent) / 0.1)",
                      }}
                    >
                      <Check
                        className="h-3 w-3"
                        style={{ color: "hsl(var(--landing-accent))" }}
                      />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </AnimatedSection>

            <AnimatedSection delay={0.1}>
              {feature.checklistVisual}
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ── Social proof / stat ── */}
      <section className="landing-section">
        <div className="landing-container">
          <AnimatedSection>
            <div
              className="rounded-2xl border p-8 md:p-12 text-center"
              style={{
                backgroundColor: "hsl(var(--landing-bg-elevated))",
                borderColor: "hsl(var(--landing-border))",
              }}
            >
              <p className="text-lg md:text-xl leading-relaxed text-l-text max-w-3xl mx-auto mb-6 italic">
                &ldquo;{feature.testimonialQuote}&rdquo;
              </p>
              <div className="flex items-center justify-center gap-3">
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center font-mono text-sm font-bold"
                  style={{
                    backgroundColor: "hsl(var(--landing-accent) / 0.1)",
                    color: "hsl(var(--landing-accent))",
                  }}
                >
                  {feature.testimonialInitials}
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-l-text">
                    {feature.testimonialName}
                  </div>
                  <div className="text-xs text-l-text-muted">
                    {feature.testimonialRole}
                  </div>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="landing-section !pt-0">
        <div className="landing-container">
          <AnimatedSection>
            <div
              className="rounded-2xl border p-10 md:p-16 text-center"
              style={{
                backgroundColor: "hsl(var(--landing-bg-elevated))",
                borderColor: "hsl(var(--landing-border))",
                boxShadow: "var(--landing-card-shadow)",
              }}
            >
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-l-text mb-3">
                {feature.finalCtaHeadline}
              </h2>
              <p className="text-sm md:text-base text-l-text-secondary mb-8 max-w-lg mx-auto">
                {feature.finalCtaDescription}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-xl px-8 py-4 text-sm font-medium transition-all hover:scale-[1.02] hover:brightness-110"
                  style={{
                    backgroundColor: "hsl(var(--landing-accent))",
                    color: "hsl(var(--landing-bg))",
                  }}
                >
                  Começar grátis
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-xl px-8 py-4 text-sm font-medium border transition-all hover:scale-[1.01]"
                  style={{
                    borderColor: "hsl(var(--landing-border-strong))",
                    color: "hsl(var(--landing-text-secondary))",
                  }}
                >
                  Já tem conta? Faça login
                </Link>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── Prev / Next nav ── */}
      <section className="pb-12">
        <div className="landing-container">
          <div
            className="flex justify-between items-center border-t pt-6"
            style={{ borderColor: "hsl(var(--landing-border))" }}
          >
            {prevSlug && prevTag ? (
              <Link
                href={`/features/${prevSlug}`}
                className="inline-flex items-center gap-1.5 text-sm text-l-text-muted hover:text-l-text transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {prevTag}
              </Link>
            ) : (
              <span />
            )}
            {nextSlug && nextTag ? (
              <Link
                href={`/features/${nextSlug}`}
                className="inline-flex items-center gap-1.5 text-sm text-l-text-muted hover:text-l-text transition-colors"
              >
                {nextTag}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <span />
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
