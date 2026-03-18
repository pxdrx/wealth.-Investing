"use client";

import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { AnimatedSection } from "@/components/landing/AnimatedSection";
import { GridPattern } from "@/components/landing/GridPattern";
import {
  ArrowRight,
  Bot,
  CalendarDays,
  BarChart3,
  CreditCard,
  FileSpreadsheet,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";

/* ── Changelog entries (real features) ──────────────────────── */
const ENTRIES = [
  {
    date: "Mar\u00e7o 2026",
    version: "v0.9.0",
    title: "AI Coach \u2014 Assistente de trading com IA",
    icon: Bot,
    tag: "Novo",
    tagColor: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    bullets: [
      "Assistente de IA com streaming em tempo real (Claude Haiku)",
      "An\u00e1lise cruzada das suas m\u00e9tricas pessoais + contexto macro",
      "Dispon\u00edvel para usu\u00e1rios Pro e Pro+ com limites de mensagens por tier",
    ],
  },
  {
    date: "Mar\u00e7o 2026",
    version: "v0.8.0",
    title: "Calend\u00e1rio de Performance redesenhado",
    icon: CalendarDays,
    tag: "Redesign",
    tagColor: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
    bullets: [
      "Novo layout visual no Dashboard e Journal com heatmap de P&L",
      "RR M\u00e9dio (m\u00e9dia de ganho / m\u00e9dia de perda) substitu\u00edu Win Rate",
      "Design alinhado com a est\u00e9tica da landing page",
    ],
  },
  {
    date: "Mar\u00e7o 2026",
    version: "v0.7.0",
    title: "Dashboard Consolidado com vis\u00e3o multi-conta",
    icon: BarChart3,
    tag: "Pro+",
    tagColor: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
    bullets: [
      "Vis\u00e3o unificada de todas as contas com PaywallGate para Pro+",
      "Oculta\u00e7\u00e3o de saldos sens\u00edveis com toggle",
      "Ordena\u00e7\u00e3o inteligente: prop \u2192 pessoal \u2192 crypto",
    ],
  },
  {
    date: "Mar\u00e7o 2026",
    version: "v0.6.0",
    title: "Sistema de Billing com Stripe",
    icon: CreditCard,
    tag: "Novo",
    tagColor: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    bullets: [
      "Checkout com cart\u00e3o de cr\u00e9dito e Pix via Stripe",
      "Webhooks para sincroniza\u00e7\u00e3o autom\u00e1tica de status",
      "P\u00e1ginas de pricing, settings e confirma\u00e7\u00e3o de assinatura",
    ],
  },
  {
    date: "Mar\u00e7o 2026",
    version: "v0.5.0",
    title: "Rule Engine \u2014 Alertas de Drawdown",
    icon: Shield,
    tag: "Novo",
    tagColor: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    bullets: [
      "Barra de drawdown com c\u00e1lculo em tempo real (RPC calc_drawdown)",
      "Alertas inteligentes para regras de mesas propriet\u00e1rias",
      "Badge de status stale para contas sem atualiza\u00e7\u00e3o recente",
    ],
  },
  {
    date: "Fevereiro 2026",
    version: "v0.4.0",
    title: "Import de opera\u00e7\u00f5es MT5 e cTrader",
    icon: FileSpreadsheet,
    tag: "Novo",
    tagColor: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    bullets: [
      "Import de XLSX e HTML do MetaTrader 5 com deduplicação autom\u00e1tica",
      "Parser de CSV do cTrader integrado \u00e0 API de import",
      "Logs de ingest\u00e3o com timing e contagem de opera\u00e7\u00f5es",
    ],
  },
] as const;

export default function ChangelogPage() {
  return (
    <div className="relative min-h-screen">
      <Navbar />

      <main>
        {/* ── Hero ────────────────────────────────────────────── */}
        <section className="relative overflow-hidden landing-section pb-12">
          <GridPattern className="opacity-20" />
          <div className="landing-container relative z-10 text-center">
            <AnimatedSection>
              <div
                className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium tracking-[0.15em] uppercase mb-6"
                style={{
                  borderColor: "hsl(var(--landing-border))",
                  color: "hsl(var(--landing-text-muted))",
                  backgroundColor: "hsl(var(--landing-bg-elevated))",
                }}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Atualiza\u00e7\u00f5es
              </div>
            </AnimatedSection>

            <AnimatedSection delay={0.05}>
              <h1 className="text-[2rem] sm:text-[2.5rem] md:text-[3rem] lg:text-[3.5rem] font-bold leading-[1.1] tracking-tighter-apple text-l-text mb-6">
                Changelog
              </h1>
            </AnimatedSection>

            <AnimatedSection delay={0.1}>
              <p className="mx-auto max-w-xl text-base md:text-lg leading-relaxed text-l-text-secondary">
                Acompanhe a evolu\u00e7\u00e3o da plataforma. Cada atualiza\u00e7\u00e3o \u00e9
                constru\u00edda com feedback real dos nossos usu\u00e1rios.
              </p>
            </AnimatedSection>
          </div>
        </section>

        {/* ── Timeline ────────────────────────────────────────── */}
        <section className="landing-container pb-20">
          <div className="relative mx-auto max-w-3xl">
            {/* Vertical line */}
            <div
              className="absolute left-6 top-0 bottom-0 w-px hidden md:block"
              style={{
                background:
                  "linear-gradient(to bottom, transparent, hsl(var(--landing-border-strong)) 5%, hsl(var(--landing-border-strong)) 95%, transparent)",
              }}
            />

            <div className="space-y-8">
              {ENTRIES.map((entry, i) => {
                const Icon = entry.icon;
                return (
                  <AnimatedSection key={entry.version} delay={i * 0.06}>
                    <div className="relative md:pl-16">
                      {/* Timeline dot */}
                      <div
                        className="absolute left-[13px] top-6 h-[26px] w-[26px] rounded-full hidden md:flex items-center justify-center z-10"
                        style={{
                          backgroundColor: "hsl(var(--landing-bg-elevated))",
                          border: "2px solid hsl(var(--landing-border-strong))",
                        }}
                      >
                        <div
                          className="h-2.5 w-2.5 rounded-full"
                          style={{
                            backgroundColor:
                              "hsl(var(--landing-accent-secondary))",
                          }}
                        />
                      </div>

                      {/* Card */}
                      <div className="landing-card p-6">
                        {/* Header */}
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                          <div
                            className="flex h-9 w-9 items-center justify-center rounded-xl"
                            style={{
                              backgroundColor:
                                "hsl(var(--landing-bg-tertiary))",
                              border:
                                "1px solid hsl(var(--landing-border))",
                            }}
                          >
                            <Icon className="h-4.5 w-4.5 text-l-accent-secondary" />
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] tracking-[0.1em] text-l-text-muted">
                              {entry.date}
                            </span>
                            <span
                              className="inline-block h-1 w-1 rounded-full"
                              style={{
                                backgroundColor:
                                  "hsl(var(--landing-border-strong))",
                              }}
                            />
                            <span className="font-mono text-[11px] tracking-[0.1em] text-l-text-muted">
                              {entry.version}
                            </span>
                          </div>

                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium tracking-[0.05em] uppercase ${entry.tagColor}`}
                          >
                            {entry.tag}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="text-base font-semibold text-l-text mb-3 tracking-tight-apple">
                          {entry.title}
                        </h3>

                        {/* Bullets */}
                        <ul className="space-y-2">
                          {entry.bullets.map((bullet, j) => (
                            <li
                              key={j}
                              className="flex items-start gap-2.5 text-sm text-l-text-secondary leading-relaxed"
                            >
                              <Zap className="h-3.5 w-3.5 mt-1 shrink-0 text-l-accent-secondary" />
                              {bullet}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </AnimatedSection>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────────────── */}
        <section className="relative overflow-hidden landing-section">
          <GridPattern className="opacity-20" />
          <AnimatedSection className="landing-container relative z-10 text-center">
            <h2 className="mx-auto max-w-2xl text-2xl sm:text-3xl md:text-4xl font-bold tracking-tighter-apple text-l-text mb-4">
              Quer ser o primeiro a testar?
            </h2>
            <p className="mx-auto max-w-lg text-base text-l-text-secondary mb-8 leading-relaxed">
              Crie sua conta gr\u00e1tis e acompanhe cada nova feature em
              primeira m\u00e3o.
            </p>
            <a
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg px-7 py-3.5 text-sm font-medium transition-all hover:brightness-110 hover:scale-[1.02]"
              style={{
                backgroundColor: "hsl(var(--landing-accent))",
                color: "hsl(var(--landing-bg))",
              }}
            >
              Crie sua conta gr\u00e1tis
              <ArrowRight className="h-4 w-4" />
            </a>
          </AnimatedSection>
        </section>
      </main>

      <Footer />
    </div>
  );
}
