"use client";

import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { AnimatedSection } from "@/components/landing/AnimatedSection";
import { GridPattern } from "@/components/landing/GridPattern";
import {
  ArrowRight,
  BookOpen,
  Clock,
  GraduationCap,
  Mail,
  Play,
  Signal,
  Bot,
  Shield,
  BarChart3,
} from "lucide-react";

/* ── Course data ────────────────────────────────────────────── */
const COURSES = [
  {
    title: "Introdução ao Journaling de Trades",
    description:
      "Aprenda a registrar operações com contexto, identificar padrões e construir o hábito que separa traders consistentes dos demais.",
    level: "Iniciante",
    levelColor: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    lessons: 5,
    duration: "2h 30min",
    icon: BookOpen,
    gradient: "from-emerald-500/25 via-teal-500/20 to-cyan-500/15",
    gradientDark: "dark:from-emerald-500/10 dark:via-teal-500/8 dark:to-cyan-500/5",
  },
  {
    title: "Análise de Performance Avançada",
    description:
      "Domine métricas como profit factor, expectancy, R-múltiplo e drawdown. Aprenda a ler dashboards e tomar decisões baseadas em dados.",
    level: "Intermediário",
    levelColor: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
    lessons: 8,
    duration: "4h 15min",
    icon: BarChart3,
    gradient: "from-blue-500/25 via-indigo-500/20 to-violet-500/15",
    gradientDark: "dark:from-blue-500/10 dark:via-indigo-500/8 dark:to-violet-500/5",
  },
  {
    title: "Gestão de Risco para Prop Traders",
    description:
      "Regras de drawdown, sizing de posição, gerenciamento de avaliações e como proteger seu capital em mesas proprietárias.",
    level: "Avançado",
    levelColor: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    lessons: 6,
    duration: "3h 45min",
    icon: Shield,
    gradient: "from-amber-500/25 via-orange-500/20 to-red-500/15",
    gradientDark: "dark:from-amber-500/10 dark:via-orange-500/8 dark:to-red-500/5",
  },
  {
    title: "Usando IA para Melhorar seu Trading",
    description:
      "Como usar o AI Coach da wealth.Investing, interpretar insights automáticos e integrar inteligência artificial no seu processo de revisão.",
    level: "Todos os níveis",
    levelColor: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
    lessons: 4,
    duration: "2h",
    icon: Bot,
    gradient: "from-purple-500/25 via-pink-500/20 to-rose-500/15",
    gradientDark: "dark:from-purple-500/10 dark:via-pink-500/8 dark:to-rose-500/5",
  },
] as const;

export default function AcademyPage() {
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
                <GraduationCap className="h-3.5 w-3.5" />
                Em breve
              </div>
            </AnimatedSection>

            <AnimatedSection delay={0.05}>
              <h1 className="text-[2rem] sm:text-[2.5rem] md:text-[3rem] lg:text-[3.5rem] font-bold leading-[1.1] tracking-tighter-apple text-l-text mb-6">
                wealth.
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage:
                      "linear-gradient(135deg, hsl(var(--landing-accent-secondary)), hsl(250 60% 60%))",
                  }}
                >
                  Academy
                </span>
              </h1>
            </AnimatedSection>

            <AnimatedSection delay={0.1}>
              <p className="mx-auto max-w-xl text-base md:text-lg leading-relaxed text-l-text-secondary">
                Aprenda a usar dados para evoluir como trader. Cursos
                práticos, diretos e baseados em evidência.
              </p>
            </AnimatedSection>

            {/* Stats */}
            <AnimatedSection delay={0.15}>
              <div className="flex items-center justify-center gap-8 mt-10">
                {[
                  { value: "4", label: "Cursos" },
                  { value: "23", label: "Aulas" },
                  { value: "12h+", label: "de conteúdo" },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <div className="text-2xl font-bold text-l-text tracking-tight-apple">
                      {stat.value}
                    </div>
                    <div className="text-xs text-l-text-muted mt-0.5">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </AnimatedSection>
          </div>
        </section>

        {/* ── Course grid ─────────────────────────────────────── */}
        <section className="landing-container pb-20">
          <div className="grid gap-6 md:grid-cols-2">
            {COURSES.map((course, i) => {
              const Icon = course.icon;
              return (
                <AnimatedSection key={course.title} delay={i * 0.08}>
                  <div className="landing-card group relative overflow-hidden h-full">
                    {/* "Em breve" overlay */}
                    <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div
                        className="absolute inset-0"
                        style={{
                          backgroundColor: "hsl(var(--landing-bg) / 0.6)",
                          backdropFilter: "blur(4px)",
                        }}
                      />
                      <div
                        className="relative z-10 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium"
                        style={{
                          backgroundColor: "hsl(var(--landing-bg-elevated))",
                          border: "1px solid hsl(var(--landing-border-strong))",
                          color: "hsl(var(--landing-text))",
                        }}
                      >
                        <Play className="h-4 w-4" />
                        Em breve
                      </div>
                    </div>

                    {/* Gradient cover */}
                    <div
                      className={`relative h-48 bg-gradient-to-br ${course.gradient} ${course.gradientDark} flex items-center justify-center`}
                    >
                      <div
                        className="absolute inset-0 opacity-[0.04]"
                        style={{
                          backgroundImage:
                            "linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)",
                          backgroundSize: "32px 32px",
                        }}
                      />
                      <div
                        className="relative flex h-16 w-16 items-center justify-center rounded-2xl"
                        style={{
                          backgroundColor: "hsl(var(--landing-bg-elevated) / 0.8)",
                          border: "1px solid hsl(var(--landing-border))",
                          backdropFilter: "blur(8px)",
                        }}
                      >
                        <Icon className="h-7 w-7 text-l-accent-secondary" />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      {/* Badges row */}
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-medium tracking-[0.05em] uppercase ${course.levelColor}`}
                        >
                          <Signal className="h-3 w-3" />
                          {course.level}
                        </span>
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-medium"
                          style={{
                            backgroundColor: "hsl(var(--landing-bg-tertiary))",
                            color: "hsl(var(--landing-text-muted))",
                          }}
                        >
                          <BookOpen className="h-3 w-3" />
                          {course.lessons} aulas
                        </span>
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-medium"
                          style={{
                            backgroundColor: "hsl(var(--landing-bg-tertiary))",
                            color: "hsl(var(--landing-text-muted))",
                          }}
                        >
                          <Clock className="h-3 w-3" />
                          {course.duration}
                        </span>
                      </div>

                      {/* Title */}
                      <h2 className="text-lg font-semibold text-l-text mb-2 leading-snug-apple tracking-tight-apple">
                        {course.title}
                      </h2>

                      {/* Description */}
                      <p className="text-sm text-l-text-secondary leading-relaxed">
                        {course.description}
                      </p>
                    </div>
                  </div>
                </AnimatedSection>
              );
            })}
          </div>
        </section>

        {/* ── Early access CTA ────────────────────────────────── */}
        <section className="relative overflow-hidden landing-section">
          <GridPattern className="opacity-15" />
          <AnimatedSection className="landing-container relative z-10 text-center">
            <div
              className="mx-auto max-w-lg rounded-[22px] p-8 md:p-10"
              style={{
                backgroundColor: "hsl(var(--landing-bg-elevated))",
                border: "1px solid hsl(var(--landing-border))",
                boxShadow: "var(--landing-card-shadow)",
              }}
            >
              <GraduationCap className="h-8 w-8 mx-auto mb-4 text-l-accent-secondary" />
              <h2 className="text-xl font-semibold text-l-text mb-2 tracking-tight-apple">
                Cadastre-se para acesso antecipado
              </h2>
              <p className="text-sm text-l-text-secondary mb-6">
                Seja o primeiro a acessar os cursos da wealth.Academy quando
                lançarmos.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  placeholder="seu@email.com"
                  className="input-ios flex-1 text-sm"
                  disabled
                />
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-input)] px-5 py-3 text-sm font-medium transition-all hover:brightness-110 opacity-60 cursor-not-allowed"
                  style={{
                    backgroundColor: "hsl(var(--landing-accent))",
                    color: "hsl(var(--landing-bg))",
                  }}
                  disabled
                >
                  Quero acesso
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-l-text-muted mt-3">
                Você será notificado assim que os cursos estiverem
                disponíveis.
              </p>
            </div>
          </AnimatedSection>
        </section>
      </main>

      <Footer />
    </div>
  );
}
