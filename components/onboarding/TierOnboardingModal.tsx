"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  LayoutDashboard,
  BarChart3,
  Brain,
  Target,
  Rocket,
  Scan,
  GraduationCap,
  Users,
  ChevronRight,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TierName } from "@/lib/onboarding/types";

interface OnboardingStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  highlights: string[];
  gradient: string;
}

type SupportedTier = Exclude<TierName, "free">;

function getSteps(tier: SupportedTier): OnboardingStep[] {
  if (tier === "pro") {
    return [
      {
        icon: <Sparkles className="h-10 w-10" />,
        title: "Bem-vindo ao Pro!",
        description:
          "Você desbloqueou o arsenal completo. Veja o que mudou em menos de 1 minuto.",
        highlights: [
          "Dashboard completo com widgets",
          "Relatórios avançados",
          "AI Coach com seus dados",
          "Psicologia e disciplina",
        ],
        gradient: "from-blue-600 to-indigo-600",
      },
      {
        icon: <LayoutDashboard className="h-10 w-10" />,
        title: "Dashboard completo",
        description:
          "Organize seu dashboard. Ative, desative e reordene widgets para focar no que importa.",
        highlights: [
          "Arraste widgets para reordenar",
          "Ative/desative em Configurações",
          "Curva de equity, mapa de sessões",
          "Termômetro Emocional em tempo real",
        ],
        gradient: "from-violet-600 to-purple-600",
      },
      {
        icon: <BarChart3 className="h-10 w-10" />,
        title: "Relatórios e Analytics",
        description:
          "Mergulhe nos seus dados. Identifique padrões, vazamentos e oportunidades.",
        highlights: [
          "Equity curve e drawdown",
          "Análise MFE/MAE por trade",
          "Breakdown por ativo, sessão, dia",
          "Profit factor, Sharpe, expectancy",
        ],
        gradient: "from-emerald-600 to-teal-600",
      },
      {
        icon: <Brain className="h-10 w-10" />,
        title: "AI Coach",
        description:
          "Pergunte sobre seus trades. Respostas baseadas nos seus dados reais.",
        highlights: [
          "Qual meu melhor dia da semana?",
          "Onde estou perdendo dinheiro?",
          "Cruza métricas + contexto macro",
          "15 consultas por mês",
        ],
        gradient: "from-amber-500 to-orange-600",
      },
      {
        icon: <Target className="h-10 w-10" />,
        title: "Psicologia e Disciplina",
        description:
          "Registre emoção, disciplina e qualidade de execução em cada trade.",
        highlights: [
          "Tags de emoção por trade",
          "Score de disciplina",
          "Termômetro Emocional no dashboard",
          "Analytics psicológico nos relatórios",
        ],
        gradient: "from-rose-500 to-pink-600",
      },
      {
        icon: <Rocket className="h-10 w-10" />,
        title: "Hora de operar com dados",
        description:
          "Tudo pronto. Importe trades, explore relatórios e construa consistência.",
        highlights: [
          "Importe trades no Journal",
          "Personalize o Dashboard",
          "Explore os Relatórios",
          "Converse com o AI Coach",
        ],
        gradient: "from-blue-600 to-cyan-600",
      },
    ];
  }

  if (tier === "ultra") {
    return [
      {
        icon: <Sparkles className="h-10 w-10" />,
        title: "Bem-vindo ao Ultra!",
        description: "Tudo do Pro + exclusivos. Vamos mostrar só o que é novo.",
        highlights: [
          "Analista Dexter",
          "Comparação de contas",
          "AI Coach 15/dia",
          "Briefing on-demand",
        ],
        gradient: "from-purple-600 to-violet-600",
      },
      {
        icon: <Scan className="h-10 w-10" />,
        title: "Analista Dexter",
        description:
          "Análise completa de qualquer ativo — técnica, fundamental, sentimento, risco.",
        highlights: [
          "Análise de 5 dimensões",
          "Veredicto com bias e confiança",
          "Níveis chave e ideia de trade",
          "Histórico de análises salvo",
        ],
        gradient: "from-cyan-500 to-blue-600",
      },
      {
        icon: <Target className="h-10 w-10" />,
        title: "Comparação e alertas",
        description:
          "Compare contas lado a lado. Configure alertas customizados.",
        highlights: [
          "Comparação entre contas",
          "Alertas de drawdown",
          "Alertas de headlines",
          "Suporte prioritário",
        ],
        gradient: "from-rose-500 to-pink-600",
      },
      {
        icon: <Brain className="h-10 w-10" />,
        title: "AI Coach + Briefing on-demand",
        description:
          "15 consultas por dia. Regenere o Briefing Macroeconômico quando quiser.",
        highlights: [
          "15 consultas AI Coach por DIA",
          "Regenerar Briefing Macroeconômico",
          "Histórico macro semanal",
          "Análise prioritária",
        ],
        gradient: "from-amber-500 to-orange-600",
      },
      {
        icon: <Rocket className="h-10 w-10" />,
        title: "Hora de explorar o Ultra",
        description:
          "Teste o Dexter, regenere briefings, opere com tudo desbloqueado.",
        highlights: [
          "Teste o Analista Dexter",
          "Regenere o Briefing",
          "Compare suas contas",
          "Explore os relatórios avançados",
        ],
        gradient: "from-blue-600 to-cyan-600",
      },
    ];
  }

  // mentor
  return [
    {
      icon: <GraduationCap className="h-10 w-10" />,
      title: "Bem-vindo, Mentor!",
      description:
        "Painel completo para acompanhar e desenvolver seus alunos.",
      highlights: [
        "Painel Mentor",
        "Gestão de alunos",
        "Drawdown agregado",
        "Comunicação direta",
      ],
      gradient: "from-amber-500 to-orange-600",
    },
    {
      icon: <LayoutDashboard className="h-10 w-10" />,
      title: "Painel Mentor",
      description:
        "Visão consolidada de todos os seus alunos em um lugar.",
      highlights: [
        "Lista de alunos vinculados",
        "Drawdown agregado",
        "Performance por aluno",
        "Atividade recente",
      ],
      gradient: "from-violet-600 to-purple-600",
    },
    {
      icon: <Users className="h-10 w-10" />,
      title: "Gestão de alunos",
      description:
        "Convide alunos, configure metas e acompanhe a evolução individual.",
      highlights: [
        "Convite por email",
        "Metas e regras por aluno",
        "Drawdown e payouts",
        "Histórico de mensagens",
      ],
      gradient: "from-emerald-600 to-teal-600",
    },
    {
      icon: <BarChart3 className="h-10 w-10" />,
      title: "Comunicação e relatórios",
      description:
        "Envie feedback direto e gere relatórios consolidados.",
      highlights: [
        "Feedback in-app",
        "Relatórios mensais",
        "Export PDF",
        "Notificações de eventos",
      ],
      gradient: "from-rose-500 to-pink-600",
    },
    {
      icon: <Rocket className="h-10 w-10" />,
      title: "Pronto para mentorear",
      description:
        "Convide seus primeiros alunos e comece a acompanhar a evolução.",
      highlights: [
        "Convide o primeiro aluno",
        "Configure metas iniciais",
        "Explore o painel",
        "Use os relatórios",
      ],
      gradient: "from-blue-600 to-cyan-600",
    },
  ];
}

interface TierOnboardingModalProps {
  open: boolean;
  tier: SupportedTier;
  onClose: () => void;
}

export function TierOnboardingModal({
  open,
  tier,
  onClose,
}: TierOnboardingModalProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  const STEPS = getSteps(tier);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const progress = ((step + 1) / STEPS.length) * 100;

  const handleNext = useCallback(() => {
    if (isLast) {
      onClose();
      return;
    }
    setDirection(1);
    setStep((s) => s + 1);
  }, [isLast, onClose]);

  const handleSkip = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto rounded-[24px]"
        style={{ backgroundColor: "hsl(var(--card))" }}
      >
        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <motion.div
            className="h-full bg-blue-600"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Skip / Close button */}
        <button
          type="button"
          onClick={handleSkip}
          className="absolute top-4 right-4 z-10 rounded-full p-2 text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/60"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Content */}
        <div className="px-8 pt-8 pb-6">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              initial={{ opacity: 0, x: direction * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -40 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Icon */}
              <div
                className={`mb-6 inline-flex items-center justify-center rounded-2xl bg-gradient-to-br ${current.gradient} p-4 text-white shadow-lg`}
              >
                {current.icon}
              </div>

              {/* Title */}
              <h2 className="text-xl font-semibold tracking-tight text-foreground mb-2">
                {current.title}
              </h2>

              {/* Description */}
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                {current.description}
              </p>

              {/* Highlights */}
              <div className="space-y-2.5">
                {current.highlights.map((h, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.06 }}
                    className="flex items-start gap-2.5"
                  >
                    <div
                      className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-br ${current.gradient}`}
                    />
                    <span className="text-sm text-foreground/80">{h}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/60 px-8 py-4">
          <button
            type="button"
            onClick={handleSkip}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Pular
          </button>

          <div className="flex items-center gap-3">
            {/* Step dots */}
            <div className="flex items-center gap-1.5">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === step
                      ? "w-4 bg-blue-600"
                      : i < step
                        ? "w-1.5 bg-blue-600/40"
                        : "w-1.5 bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>

            <Button onClick={handleNext} className="rounded-full gap-1.5">
              {isLast ? "Começar" : "Próximo"}
              {!isLast && <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
