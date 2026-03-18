"use client";

import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { AnimatedSection } from "@/components/landing/AnimatedSection";
import { GridPattern } from "@/components/landing/GridPattern";
import {
  Clock,
  Calendar,
  Tag,
  ArrowRight,
  Mail,
  BookOpen,
} from "lucide-react";

/* ── Mock blog posts ────────────────────────────────────────── */
const POSTS = [
  {
    title: "5 Erros que Todo Trader Iniciante Comete",
    excerpt:
      "De overtrading a falta de gest\u00e3o de risco: os erros mais comuns que impedem traders de alcan\u00e7ar consist\u00eancia \u2014 e como evit\u00e1-los com dados.",
    date: "15 Mar 2026",
    readTime: "7 min",
    category: "Psicologia",
    gradient: "from-red-500/30 to-orange-500/30",
    gradientDark: "dark:from-red-500/15 dark:to-orange-500/15",
  },
  {
    title: "Como Usar um Di\u00e1rio de Trading para Aumentar sua Performance",
    excerpt:
      "O journaling \u00e9 a ferramenta mais subestimada no trading. Descubra como registrar, revisar e extrair insights que transformam seu operacional.",
    date: "12 Mar 2026",
    readTime: "10 min",
    category: "Journaling",
    gradient: "from-blue-500/30 to-indigo-500/30",
    gradientDark: "dark:from-blue-500/15 dark:to-indigo-500/15",
  },
  {
    title: "Prop Firms: O Guia Completo para 2026",
    excerpt:
      "Tudo que voc\u00ea precisa saber sobre mesas propriet\u00e1rias: como funcionam, quais as melhores, regras de drawdown e como passar na avalia\u00e7\u00e3o.",
    date: "08 Mar 2026",
    readTime: "15 min",
    category: "Prop Trading",
    gradient: "from-emerald-500/30 to-teal-500/30",
    gradientDark: "dark:from-emerald-500/15 dark:to-teal-500/15",
  },
  {
    title: "A Import\u00e2ncia da Gest\u00e3o de Risco no Day Trade",
    excerpt:
      "Sem gest\u00e3o de risco, at\u00e9 o melhor setup do mundo vai quebrar sua conta. Aprenda a calcular tamanho de posi\u00e7\u00e3o, definir stops e proteger seu capital.",
    date: "03 Mar 2026",
    readTime: "12 min",
    category: "Gest\u00e3o de Risco",
    gradient: "from-purple-500/30 to-pink-500/30",
    gradientDark: "dark:from-purple-500/15 dark:to-pink-500/15",
  },
] as const;

export default function BlogPage() {
  return (
    <div className="relative min-h-screen">
      <Navbar />

      <main>
        {/* ── Hero ────────────────────────────────────────────── */}
        <section className="relative overflow-hidden landing-section pb-12">
          <GridPattern className="opacity-20" />
          <div className="landing-container relative z-10 text-center">
            <AnimatedSection>
              <div className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium tracking-[0.15em] uppercase mb-6"
                style={{
                  borderColor: "hsl(var(--landing-border))",
                  color: "hsl(var(--landing-text-muted))",
                  backgroundColor: "hsl(var(--landing-bg-elevated))",
                }}
              >
                <BookOpen className="h-3.5 w-3.5" />
                Em breve
              </div>
            </AnimatedSection>

            <AnimatedSection delay={0.05}>
              <h1 className="text-[2rem] sm:text-[2.5rem] md:text-[3rem] lg:text-[3.5rem] font-bold leading-[1.1] tracking-tighter-apple text-l-text mb-6">
                Blog
              </h1>
            </AnimatedSection>

            <AnimatedSection delay={0.1}>
              <p className="mx-auto max-w-xl text-base md:text-lg leading-relaxed text-l-text-secondary">
                Insights sobre trading, mercado e performance para traders que
                levam a s\u00e9rio sua evolu\u00e7\u00e3o.
              </p>
            </AnimatedSection>
          </div>
        </section>

        {/* ── Blog grid ───────────────────────────────────────── */}
        <section className="landing-container pb-20">
          <div className="grid gap-6 md:grid-cols-2">
            {POSTS.map((post, i) => (
              <AnimatedSection key={post.title} delay={i * 0.08}>
                <div className="landing-card group relative overflow-hidden h-full">
                  {/* "Em breve" overlay */}
                  <div
                    className="absolute top-4 right-4 z-10 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-medium tracking-[0.1em] uppercase backdrop-blur-sm"
                    style={{
                      backgroundColor: "hsl(var(--landing-bg-tertiary) / 0.9)",
                      border: "1px solid hsl(var(--landing-border))",
                      color: "hsl(var(--landing-text-muted))",
                    }}
                  >
                    Em breve
                  </div>

                  {/* Gradient cover image area */}
                  <div
                    className={`h-44 bg-gradient-to-br ${post.gradient} ${post.gradientDark} relative`}
                  >
                    <div
                      className="absolute inset-0 opacity-[0.04]"
                      style={{
                        backgroundImage:
                          "linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)",
                        backgroundSize: "32px 32px",
                      }}
                    />
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    {/* Category tag */}
                    <div className="flex items-center gap-3 mb-3">
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                        style={{
                          backgroundColor: "hsl(var(--landing-bg-tertiary))",
                          color: "hsl(var(--landing-text-secondary))",
                        }}
                      >
                        <Tag className="h-3 w-3" />
                        {post.category}
                      </span>
                    </div>

                    {/* Title */}
                    <h2 className="text-lg font-semibold text-l-text mb-3 leading-snug-apple tracking-tight-apple">
                      {post.title}
                    </h2>

                    {/* Excerpt */}
                    <p className="text-sm text-l-text-secondary leading-relaxed mb-4">
                      {post.excerpt}
                    </p>

                    {/* Meta */}
                    <div className="flex items-center gap-4 text-xs text-l-text-muted">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {post.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {post.readTime}
                      </span>
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </section>

        {/* ── Newsletter CTA ──────────────────────────────────── */}
        <section className="relative overflow-hidden landing-section">
          <GridPattern className="opacity-15" />
          <AnimatedSection className="landing-container relative z-10 text-center">
            <div
              className="mx-auto max-w-lg rounded-2xl p-8 md:p-10"
              style={{
                backgroundColor: "hsl(var(--landing-bg-elevated))",
                border: "1px solid hsl(var(--landing-border))",
                boxShadow: "var(--landing-card-shadow)",
              }}
            >
              <Mail className="h-8 w-8 mx-auto mb-4 text-l-accent-secondary" />
              <h2 className="text-xl font-semibold text-l-text mb-2 tracking-tight-apple">
                Em breve teremos novos artigos
              </h2>
              <p className="text-sm text-l-text-secondary mb-6">
                Cadastre-se para ser notificado quando publicarmos conte\u00fado
                sobre trading, performance e evolu\u00e7\u00e3o.
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
                  Notifique-me
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-l-text-muted mt-3">
                Sem spam. Apenas conte\u00fado relevante para traders.
              </p>
            </div>
          </AnimatedSection>
        </section>
      </main>

      <Footer />
    </div>
  );
}
