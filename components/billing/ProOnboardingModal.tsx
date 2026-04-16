"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  BarChart3,
  Brain,
  Sparkles,
  Target,
  Rocket,
  ChevronRight,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

import { Scan } from "lucide-react";

const STORAGE_KEY_PREFIX = "wealth-onboarding-seen";

/** Legacy key from before plan-aware storage */
const LEGACY_STORAGE_KEY = "wealth-pro-onboarding-seen";

function storageKey(plan: "pro" | "ultra"): string {
  return `${STORAGE_KEY_PREFIX}-${plan}`;
}

interface OnboardingStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  highlights: string[];
  gradient: string;
}

function getSteps(plan: "pro" | "ultra"): OnboardingStep[] {
  const isUltra = plan === "ultra";
  const planName = isUltra ? "Ultra" : "Pro";
  const steps: OnboardingStep[] = [
    {
      icon: <Sparkles className="h-10 w-10" />,
      title: `Bem-vindo ao ${planName}!`,
      description: isUltra
        ? "Você desbloqueou o nível máximo da wealth.Investing — tudo ilimitado, AI avançada e análise profissional. Veja o que você tem acesso."
        : "Você desbloqueou o arsenal completo da wealth.Investing. Vamos te mostrar o que mudou na sua experiência — em menos de 1 minuto.",
      highlights: isUltra
        ? [
            "Tudo do Pro + exclusivos Ultra",
            "Contas ilimitadas",
            "Analista Dexter com IA",
            "15 consultas AI Coach por dia",
          ]
        : [
            "Dashboard completo",
            "Relatórios e analytics",
            "AI Coach com seus dados",
            "Psicologia e disciplina",
          ],
      gradient: isUltra ? "from-purple-600 to-violet-600" : "from-blue-600 to-indigo-600",
    },
    {
      icon: <LayoutDashboard className="h-10 w-10" />,
      title: "Dashboard Completo",
      description:
        "Organize seu dashboard do seu jeito. Ative, desative e reordene widgets para focar no que importa para o seu operacional.",
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
      title: "Relatórios & Analytics",
      description:
        "Mergulhe nos seus dados com relatórios que traders profissionais usam. Identifique padrões, vazamentos e oportunidades.",
      highlights: isUltra
        ? [
            "Relatórios avançados (MFE/MAE, Sharpe, Kelly)",
            "Breakdown por ativo, sessão, dia",
            "Export PDF dos relatórios",
            "Profit factor, Sortino, expectancy",
          ]
        : [
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
      description: isUltra
        ? "15 consultas por dia com o AI Coach. Pergunte qualquer coisa sobre seus trades e receba respostas baseadas nos seus dados reais."
        : "Pergunte qualquer coisa sobre seus trades e receba respostas baseadas nos seus dados reais. Não é um chatbot genérico — é o seu analista pessoal.",
      highlights: [
        '"Qual meu melhor dia da semana?"',
        '"Onde estou perdendo dinheiro?"',
        "Cruza suas métricas + contexto macro",
        isUltra ? "15 consultas por dia" : "15 consultas por mês",
      ],
      gradient: "from-amber-500 to-orange-600",
    },
  ];

  // Ultra-exclusive steps
  if (isUltra) {
    steps.push({
      icon: <Scan className="h-10 w-10" />,
      title: "Analista Dexter",
      description:
        "Seu analista financeiro com IA. Digite qualquer ativo — ações, forex, cripto, commodities — e receba uma análise completa: técnica, fundamental, sentimento, risco e veredicto.",
      highlights: [
        "Análise de 5 dimensões por ativo",
        "Veredicto com bias e confiança",
        "Níveis chave e ideia de trade",
        "Histórico de análises salvo",
      ],
      gradient: "from-cyan-500 to-blue-600",
    });
    steps.push({
      icon: <Target className="h-10 w-10" />,
      title: "Exclusivos Ultra",
      description:
        "Funcionalidades que só o Ultra tem. Comparação de contas, alertas customizados, regeneração de briefing on-demand e histórico macro semanal.",
      highlights: [
        "Comparação entre contas",
        "Alertas de drawdown e headlines",
        "Regenerar Briefing Macroeconômico",
        "Suporte prioritário",
      ],
      gradient: "from-rose-500 to-pink-600",
    });
  } else {
    steps.push({
      icon: <Target className="h-10 w-10" />,
      title: "Psicologia & Disciplina",
      description:
        "Registre emoção, disciplina e qualidade de execução em cada trade. O Termômetro Emocional te avisa quando você está saindo do plano.",
      highlights: [
        "Tags de emoção por trade",
        "Score de disciplina",
        "Termômetro Emocional no dashboard",
        "Analytics psicológico nos relatórios",
      ],
      gradient: "from-rose-500 to-pink-600",
    });
  }

  // Final step
  steps.push({
    icon: <Rocket className="h-10 w-10" />,
    title: "Hora de operar com dados",
    description:
      "Tudo pronto. Importe seus trades, explore os relatórios e comece a construir consistência com dados reais. Boas operações!",
    highlights: isUltra
      ? [
          "Teste o Analista Dexter",
          "Personalize o Dashboard",
          "Explore os Relatórios Avançados",
          "Converse com o AI Coach",
        ]
      : [
          "Importe trades no Journal",
          "Personalize o Dashboard",
          "Explore os Relatórios",
          "Converse com o AI Coach",
        ],
    gradient: "from-blue-600 to-cyan-600",
  });

  return steps;
}

export function hasSeenProOnboarding(plan?: "pro" | "ultra"): boolean {
  if (typeof window === "undefined") return true;
  if (!plan) {
    // Fallback: check both plan keys + legacy key
    return (
      localStorage.getItem(storageKey("pro")) === "true" ||
      localStorage.getItem(storageKey("ultra")) === "true" ||
      localStorage.getItem(LEGACY_STORAGE_KEY) === "true"
    );
  }
  // Check the specific plan key
  if (localStorage.getItem(storageKey(plan)) === "true") return true;
  // If checking "pro" and legacy key exists, honor it (existing users who already saw Pro onboarding)
  if (plan === "pro" && localStorage.getItem(LEGACY_STORAGE_KEY) === "true") return true;
  return false;
}

export function markProOnboardingSeen(plan: "pro" | "ultra" = "pro"): void {
  try {
    localStorage.setItem(storageKey(plan), "true");
    // Also set legacy key for backwards compat
    localStorage.setItem(LEGACY_STORAGE_KEY, "true");
  } catch {}
}

interface ProOnboardingModalProps {
  open: boolean;
  onClose: () => void;
  plan?: "pro" | "ultra";
}

export function ProOnboardingModal({ open, onClose, plan = "pro" }: ProOnboardingModalProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  const STEPS = getSteps(plan);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const progress = ((step + 1) / STEPS.length) * 100;

  const handleNext = useCallback(() => {
    if (isLast) {
      markProOnboardingSeen(plan);
      onClose();
      return;
    }
    setDirection(1);
    setStep((s) => s + 1);
  }, [isLast, onClose, plan]);

  const handleSkip = useCallback(() => {
    markProOnboardingSeen(plan);
    onClose();
  }, [onClose, plan]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-lg mx-4 rounded-[24px] overflow-hidden"
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

            <Button
              onClick={handleNext}
              className="rounded-full gap-1.5"
            >
              {isLast ? "Começar" : "Próximo"}
              {!isLast && <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
