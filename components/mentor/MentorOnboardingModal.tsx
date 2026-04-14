"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Ticket, LineChart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";

const easeApple = [0.16, 1, 0.3, 1] as const;

interface MentorOnboardingModalProps {
  open: boolean;
  onComplete: () => void;
}

interface Slide {
  icon: React.ReactNode;
  title: string;
  body: string;
}

const SLIDES: Slide[] = [
  {
    icon: <Users className="h-6 w-6" />,
    title: "Bem-vindo, mentor",
    body:
      "Este é o seu espaço para acompanhar e orientar seus alunos. Aqui você gerencia convites, monitora desempenho e deixa notas para cada aluno vinculado.",
  },
  {
    icon: <Ticket className="h-6 w-6" />,
    title: "Gerando códigos de convite",
    body:
      "Gere códigos únicos no Painel do Mentor e compartilhe com seus alunos. Cada código vincula um aluno à sua mentoria — basta ele inserir o código em Configurações.",
  },
  {
    icon: <LineChart className="h-6 w-6" />,
    title: "Acompanhando alunos",
    body:
      "Veja KPIs consolidados, últimos trades e histórico de cada aluno. Deixe notas privadas em trades específicos para orientar com contexto real da operação.",
  },
];

export function MentorOnboardingModal({ open, onComplete }: MentorOnboardingModalProps) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const isLast = step === SLIDES.length - 1;
  const slide = SLIDES[step];

  const handleNext = () => {
    setStep((s) => Math.min(s + 1, SLIDES.length - 1));
  };

  const handleBack = () => {
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleFinish = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada");
      const res = await fetch("/api/profile/mentor-onboarded", {
        method: "POST",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? "Erro ao concluir onboarding");
      }
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        className="relative w-full max-w-md rounded-[22px] border border-border/40 shadow-lg overflow-hidden"
        style={{ backgroundColor: "hsl(var(--card))" }}
      >
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 pt-6">
          {SLIDES.map((_, idx) => (
            <span
              key={idx}
              className={`h-1.5 rounded-full transition-all ${
                idx === step ? "w-6 bg-foreground" : "w-1.5 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        <div className="px-6 pt-5 pb-6 min-h-[260px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: easeApple }}
              className="flex flex-col items-center text-center"
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full mb-4 text-foreground"
                style={{ backgroundColor: "hsl(var(--muted))" }}
              >
                {slide.icon}
              </div>
              <h2 className="text-xl font-semibold tracking-tight-apple">
                {slide.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {slide.body}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {error && (
          <div className="px-6 pb-2 text-xs text-red-500 text-center">{error}</div>
        )}

        <div className="flex items-center justify-between gap-2 px-6 pb-6">
          <Button
            variant="ghost"
            className="rounded-full"
            onClick={handleBack}
            disabled={step === 0 || submitting}
          >
            Voltar
          </Button>

          {!isLast ? (
            <Button className="rounded-full" onClick={handleNext}>
              Próximo
            </Button>
          ) : (
            <Button
              className="rounded-full"
              onClick={handleFinish}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Concluindo...
                </>
              ) : (
                "Começar"
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
