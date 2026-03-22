"use client";

import { useRef } from "react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { AnimatedSection } from "@/components/landing/AnimatedSection";
import { GridPattern } from "@/components/landing/GridPattern";
import {
  Target,
  Compass,
  Heart,
  Users,
  Rocket,
  ArrowRight,
  BarChart3,
  Brain,
  Shield,
  Sparkles,
} from "lucide-react";

/* ── Manifesto section data ─────────────────────────────────── */
const SECTIONS = [
  {
    id: "problema",
    icon: Target,
    label: "O PROBLEMA",
    number: "01",
    headline: "A maioria dos traders falha. Mas não por falta de habilidade.",
    paragraphs: [
      "Eles operam sem dados. Repetem os mesmos erros semana após semana. Não têm sistema de revisão. Não sabem quais setups realmente sustentam seu P&L — e quais estão destruindo seu capital silenciosamente.",
      "Planilhas manuais, prints de gráfico no WhatsApp, anotações em caderno. A maioria das ferramentas disponíveis foi feita para hedge funds com orçamentos milionários — não para o trader independente que precisa de clareza para evoluir.",
    ],
    accent: "from-red-500/20 to-orange-500/20",
    accentDark: "dark:from-red-500/10 dark:to-orange-500/10",
  },
  {
    id: "missao",
    icon: Compass,
    label: "NOSSA MISSÃO",
    number: "02",
    headline: "Democratizar as ferramentas que antes só os profissionais tinham.",
    paragraphs: [
      "A wealth.Investing nasceu de uma frustração real: por que as ferramentas profissionais de análise de performance são inacessíveis para a maioria dos traders?",
      "Nossa missão é simples: dar a cada trader — independentemente do tamanho da conta — as mesmas ferramentas de análise, gestão de risco e inteligência que os melhores fundos do mundo usam. Sem planilhas. Sem complexidade desnecessária.",
    ],
    accent: "from-blue-500/20 to-indigo-500/20",
    accentDark: "dark:from-blue-500/10 dark:to-indigo-500/10",
  },
  {
    id: "move",
    icon: Heart,
    label: "O QUE NOS MOVE",
    number: "03",
    headline: "Acreditamos que todo trader merece ferramentas que inspirem disciplina.",
    paragraphs: [
      "Não basta ter dados — é preciso que a experiência de usá-los seja bonita, intuitiva e prazerosa. Quando a ferramenta é boa, você quer usá-la. E quando você usa, você melhora.",
    ],
    bullets: [
      { icon: BarChart3, text: "Analytics inteligentes que revelam padrões ocultos" },
      { icon: Brain, text: "AI Coach que conhece cada trade seu" },
      { icon: Shield, text: "Gestão de risco integrada às mesas proprietárias" },
      { icon: Sparkles, text: "Design premium que você tem prazer em usar" },
    ],
    accent: "from-purple-500/20 to-pink-500/20",
    accentDark: "dark:from-purple-500/10 dark:to-pink-500/10",
  },
  {
    id: "para-quem",
    icon: Users,
    label: "PARA QUEM CONSTRUÍMOS",
    number: "04",
    headline: "Para o trader que leva a sério a sua evolução.",
    paragraphs: [
      "O prop trader que estuda depois do expediente e precisa de cada dado para passar na avaliação. O day trader que sabe que disciplina é mais importante que estratégia. O swing trader que quer entender seus padrões de longo prazo.",
      "Se você acredita que consistência se constrói com dados, processo e revisão — a wealth.Investing foi feita para você.",
    ],
    accent: "from-emerald-500/20 to-teal-500/20",
    accentDark: "dark:from-emerald-500/10 dark:to-teal-500/10",
  },
  {
    id: "promessa",
    icon: Rocket,
    label: "NOSSA PROMESSA",
    number: "05",
    headline: "Nunca vamos parar de melhorar.",
    paragraphs: [
      "Cada feature é desenhada para te ajudar a operar melhor — não apenas rastrear trades. Ouvimos nossos usuários obsessivamente. Iteramos toda semana. Publicamos changelog aberto.",
      "Nosso compromisso: construir a melhor plataforma de journaling e análise de performance para traders independentes do Brasil e do mundo.",
    ],
    accent: "from-amber-500/20 to-yellow-500/20",
    accentDark: "dark:from-amber-500/10 dark:to-yellow-500/10",
  },
] as const;

/* ── Values grid ────────────────────────────────────────────── */
const VALUES = [
  {
    title: "Transparência",
    description: "Changelog aberto, roadmap público, comunicação honesta.",
  },
  {
    title: "Obsessão pelo usuário",
    description: "Cada pixel, cada feature existe para resolver um problema real.",
  },
  {
    title: "Dados > Opinião",
    description: "Decisões baseadas em evidência, no trading e no produto.",
  },
  {
    title: "Acessibilidade",
    description: "Ferramentas profissionais a preços que qualquer trader pode pagar.",
  },
] as const;

export default function ManifestoPage() {
  const ctaRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative min-h-screen">
      <Navbar />

      <main>
        {/* ── Hero cover ──────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          {/* Dramatic gradient background */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, hsl(220 40% 8%) 0%, hsl(250 35% 12%) 30%, hsl(215 25% 15%) 60%, hsl(220 40% 8%) 100%)",
            }}
          />
          {/* Animated grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
            }}
          />
          {/* Radial glow */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 50% 30%, hsla(217, 60%, 50%, 0.15) 0%, transparent 60%)",
            }}
          />
          {/* Floating orbs */}
          <div
            className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full opacity-[0.07] blur-[120px]"
            style={{ backgroundColor: "hsl(217 60% 50%)" }}
          />
          <div
            className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full opacity-[0.05] blur-[100px]"
            style={{ backgroundColor: "hsl(250 50% 60%)" }}
          />

          <div className="relative z-10 landing-container flex flex-col items-center justify-center min-h-[85vh] text-center py-24">
            <div className="hero-fade-in" style={{ animationDelay: "0s" }}>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium tracking-[0.15em] uppercase text-white/60 backdrop-blur-sm mb-8">
                Nosso Manifesto
              </span>
            </div>

            <h1
              className="hero-fade-in max-w-4xl text-[2.25rem] sm:text-[3rem] md:text-[3.75rem] lg:text-[4.5rem] font-bold leading-[1.05] tracking-tighter-apple text-white mb-8"
              style={{ animationDelay: "0.1s" }}
            >
              Todo trader merece as ferramentas que os{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, hsl(217 80% 65%), hsl(250 70% 70%))",
                }}
              >
                profissionais
              </span>{" "}
              usam.
            </h1>

            <p
              className="hero-fade-in max-w-2xl text-base sm:text-lg md:text-xl leading-relaxed text-white/55 mb-12"
              style={{ animationDelay: "0.2s" }}
            >
              A história de por que construímos a wealth.Investing — e a visão
              que nos guia todos os dias.
            </p>

            <div className="hero-fade-in" style={{ animationDelay: "0.3s" }}>
              <button
                onClick={() =>
                  document
                    .getElementById("problema")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium text-white/80 backdrop-blur-sm transition-all hover:bg-white/10 hover:border-white/25"
              >
                Conheça nossa história
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>

          {/* Bottom fade */}
          <div
            className="absolute bottom-0 left-0 right-0 h-32"
            style={{
              background:
                "linear-gradient(to top, hsl(var(--landing-bg)), transparent)",
            }}
          />
        </section>

        {/* ── Manifesto sections ──────────────────────────────── */}
        {SECTIONS.map((section, i) => {
          const Icon = section.icon;
          return (
            <section
              key={section.id}
              id={section.id}
              className="relative overflow-hidden"
            >
              <GridPattern className="opacity-15" />
              <div className="landing-container relative z-10 py-24 md:py-32 lg:py-40">
                <AnimatedSection className="max-w-3xl mx-auto">
                  {/* Label */}
                  <div className="flex items-center gap-3 mb-8">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl"
                      style={{
                        backgroundColor: "hsl(var(--landing-bg-tertiary))",
                        border: "1px solid hsl(var(--landing-border))",
                      }}
                    >
                      <Icon className="h-5 w-5 text-l-accent-secondary" />
                    </div>
                    <span className="font-mono text-[11px] tracking-[0.15em] uppercase text-l-text-muted">
                      {section.label}
                    </span>
                    <span className="font-mono text-[11px] tracking-[0.15em] text-l-text-muted/50">
                      {section.number}
                    </span>
                  </div>

                  {/* Headline */}
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tighter-apple text-l-text mb-8 leading-[1.1]">
                    {section.headline}
                  </h2>

                  {/* Paragraphs */}
                  {section.paragraphs.map((p, j) => (
                    <p
                      key={j}
                      className="text-base md:text-lg leading-relaxed text-l-text-secondary mb-6"
                    >
                      {p}
                    </p>
                  ))}

                  {/* Bullets (for "O Que Nos Move") */}
                  {"bullets" in section && section.bullets && (
                    <div className="grid gap-4 sm:grid-cols-2 mt-8">
                      {section.bullets.map((bullet, k) => {
                        const BulletIcon = bullet.icon;
                        return (
                          <div
                            key={k}
                            className="flex items-start gap-3 rounded-2xl p-4 transition-all"
                            style={{
                              backgroundColor:
                                "hsl(var(--landing-bg-elevated))",
                              border:
                                "1px solid hsl(var(--landing-border))",
                            }}
                          >
                            <BulletIcon className="h-5 w-5 mt-0.5 text-l-accent-secondary shrink-0" />
                            <span className="text-sm text-l-text-secondary leading-relaxed">
                              {bullet.text}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </AnimatedSection>
              </div>

              {/* Section divider */}
              {i < SECTIONS.length - 1 && (
                <div
                  className="mx-auto max-w-[200px] h-px"
                  style={{
                    background:
                      "linear-gradient(to right, transparent, hsl(var(--landing-border-strong)), transparent)",
                  }}
                />
              )}
            </section>
          );
        })}

        {/* ── Values grid ─────────────────────────────────────── */}
        <section className="relative overflow-hidden landing-section">
          <GridPattern className="opacity-15" />
          <div className="landing-container relative z-10">
            <AnimatedSection className="text-center mb-16">
              <span className="font-mono text-[11px] tracking-[0.15em] uppercase text-l-text-muted mb-4 block">
                NOSSOS VALORES
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tighter-apple text-l-text">
                Os princípios que guiam cada decisão
              </h2>
            </AnimatedSection>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {VALUES.map((value, i) => (
                <AnimatedSection key={value.title} delay={i * 0.1}>
                  <div
                    className="landing-card landing-card-hover p-6 h-full"
                  >
                    <div
                      className="w-8 h-8 rounded-lg mb-4 flex items-center justify-center text-sm font-bold"
                      style={{
                        backgroundColor: "hsl(var(--landing-bg-tertiary))",
                        color: "hsl(var(--landing-text-muted))",
                      }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <h3 className="text-base font-semibold text-l-text mb-2">
                      {value.title}
                    </h3>
                    <p className="text-sm text-l-text-secondary leading-relaxed">
                      {value.description}
                    </p>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* ── Final CTA ───────────────────────────────────────── */}
        <section className="relative overflow-hidden" ref={ctaRef}>
          {/* Gradient background matching hero */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, hsl(220 40% 8%) 0%, hsl(250 35% 12%) 30%, hsl(215 25% 15%) 60%, hsl(220 40% 8%) 100%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 50% 50%, hsla(217, 60%, 50%, 0.12) 0%, transparent 60%)",
            }}
          />

          <AnimatedSection className="relative z-10 landing-container py-24 md:py-32">
            <div className="flex flex-col items-center text-center">
              {/* Cover image card */}
              <div className="w-full max-w-md rounded-[22px] overflow-hidden mb-12 shadow-2xl shadow-black/40 border border-white/10">
                <img
                  src="/manifesto-cover.png"
                  alt="wealth.Investing — Crescimento e evolução"
                  className="w-full h-auto object-cover"
                />
              </div>

            <h2 className="mx-auto max-w-2xl text-2xl sm:text-3xl md:text-4xl font-bold tracking-tighter-apple text-white mb-6 leading-[1.1]">
              Pronto para transformar seus dados em consistência?
            </h2>
            <p className="mx-auto max-w-lg text-base text-white/50 mb-10 leading-relaxed">
              Junte-se a traders que estão usando dados, processo e revisão
              para evoluir todos os dias.
            </p>
            <a
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg px-8 py-4 text-sm font-medium text-white transition-all hover:brightness-110 hover:scale-[1.02]"
              style={{
                background:
                  "linear-gradient(135deg, hsl(217 70% 55%), hsl(250 60% 60%))",
              }}
            >
              Junte-se a nós
              <ArrowRight className="h-4 w-4" />
            </a>
            </div>
          </AnimatedSection>
        </section>
      </main>

      <Footer />
    </div>
  );
}
