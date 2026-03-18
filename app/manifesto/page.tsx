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
    headline: "A maioria dos traders falha. Mas n\u00e3o por falta de habilidade.",
    paragraphs: [
      "Eles operam sem dados. Repetem os mesmos erros semana ap\u00f3s semana. N\u00e3o t\u00eam sistema de revis\u00e3o. N\u00e3o sabem quais setups realmente sustentam seu P&L \u2014 e quais est\u00e3o destruindo seu capital silenciosamente.",
      "Planilhas manuais, prints de gr\u00e1fico no WhatsApp, anota\u00e7\u00f5es em caderno. A maioria das ferramentas dispon\u00edveis foram feitas para hedge funds com or\u00e7amentos milion\u00e1rios \u2014 n\u00e3o para o trader independente que precisa de clareza para evoluir.",
    ],
    accent: "from-red-500/20 to-orange-500/20",
    accentDark: "dark:from-red-500/10 dark:to-orange-500/10",
  },
  {
    id: "missao",
    icon: Compass,
    label: "NOSSA MISS\u00c3O",
    number: "02",
    headline: "Democratizar as ferramentas que antes s\u00f3 os profissionais tinham.",
    paragraphs: [
      "A wealth.Investing nasceu de uma frustra\u00e7\u00e3o real: por que ferramentas profissionais de an\u00e1lise de performance s\u00e3o inacess\u00edveis para a maioria dos traders?",
      "Nossa miss\u00e3o \u00e9 simples: dar a cada trader \u2014 independente do tamanho da conta \u2014 as mesmas ferramentas de an\u00e1lise, gest\u00e3o de risco e intelig\u00eancia que os melhores fundos do mundo usam. Sem planilhas. Sem complexidade desnecess\u00e1ria.",
    ],
    accent: "from-blue-500/20 to-indigo-500/20",
    accentDark: "dark:from-blue-500/10 dark:to-indigo-500/10",
  },
  {
    id: "move",
    icon: Heart,
    label: "O QUE NOS MOVE",
    number: "03",
    headline: "Acreditamos que todo trader merece ferramentas que inspiram disciplina.",
    paragraphs: [
      "N\u00e3o basta ter dados \u2014 \u00e9 preciso que a experi\u00eancia de us\u00e1-los seja bonita, intuitiva e prazerosa. Quando a ferramenta \u00e9 boa, voc\u00ea quer us\u00e1-la. E quando voc\u00ea usa, voc\u00ea melhora.",
    ],
    bullets: [
      { icon: BarChart3, text: "Analytics inteligentes que revelam padr\u00f5es ocultos" },
      { icon: Brain, text: "AI Coach que conhece cada trade seu" },
      { icon: Shield, text: "Gest\u00e3o de risco integrada a mesas propriet\u00e1rias" },
      { icon: Sparkles, text: "Design premium que voc\u00ea tem prazer em usar" },
    ],
    accent: "from-purple-500/20 to-pink-500/20",
    accentDark: "dark:from-purple-500/10 dark:to-pink-500/10",
  },
  {
    id: "para-quem",
    icon: Users,
    label: "PARA QUEM CONSTRU\u00cdMOS",
    number: "04",
    headline: "Para o trader que leva a s\u00e9rio sua evolu\u00e7\u00e3o.",
    paragraphs: [
      "O prop trader que estuda depois do expediente e precisa de cada dado para passar a avalia\u00e7\u00e3o. O day trader que sabe que disciplina \u00e9 mais importante que estrat\u00e9gia. O swing trader que quer entender seus padr\u00f5es de longo prazo.",
      "Se voc\u00ea acredita que consist\u00eancia se constr\u00f3i com dados, processo e revis\u00e3o \u2014 a wealth.Investing foi feita para voc\u00ea.",
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
      "Cada feature \u00e9 desenhada para te ajudar a operar melhor \u2014 n\u00e3o apenas rastrear trades. Ouvimos nossos usu\u00e1rios obsessivamente. Iteramos toda semana. Publicamos changelog aberto.",
      "Nosso compromisso: construir a melhor plataforma de journaling e an\u00e1lise de performance para traders independentes do Brasil e do mundo.",
    ],
    accent: "from-amber-500/20 to-yellow-500/20",
    accentDark: "dark:from-amber-500/10 dark:to-yellow-500/10",
  },
] as const;

/* ── Values grid ────────────────────────────────────────────── */
const VALUES = [
  {
    title: "Transpar\u00eancia",
    description: "Changelog aberto, roadmap p\u00fablico, comunica\u00e7\u00e3o honesta.",
  },
  {
    title: "Obsess\u00e3o pelo usu\u00e1rio",
    description: "Cada pixel, cada feature existe para resolver um problema real.",
  },
  {
    title: "Dados > Opini\u00e3o",
    description: "Decis\u00f5es baseadas em evid\u00eancia, no trading e no produto.",
  },
  {
    title: "Acessibilidade",
    description: "Ferramentas profissionais a pre\u00e7os que qualquer trader pode pagar.",
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
              A hist\u00f3ria de por que constru\u00edmos a wealth.Investing \u2014 e a vis\u00e3o
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
                Conhe\u00e7a nossa hist\u00f3ria
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
                Os princ\u00edpios que guiam cada decis\u00e3o
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
              Pronto para transformar seus dados em consist\u00eancia?
            </h2>
            <p className="mx-auto max-w-lg text-base text-white/50 mb-10 leading-relaxed">
              Junte-se a traders que est\u00e3o usando dados, processo e revis\u00e3o
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
              Junte-se a n\u00f3s
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
