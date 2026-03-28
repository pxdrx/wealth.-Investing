"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, Sparkles, BookOpen } from "lucide-react";

const easeApple = [0.16, 1, 0.3, 1] as const;

interface OnboardingTourProps {
  onComplete: () => void;
}

interface TourStep {
  id: string;
  title: string;
  description: string;
  /** data-tour-id for desktop (sidebar) */
  sidebarTarget?: string;
  /** data-tour-id for mobile (bottom nav) */
  mobileTarget?: string;
  /** If true, show as centered modal instead of tooltip */
  centered?: boolean;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Bem-vindo ao wealth.Investing!",
    description:
      "Vamos fazer um tour rapido pela plataforma. Leva menos de 1 minuto.",
    centered: true,
  },
  {
    id: "dashboard",
    title: "Dashboard",
    description:
      "Aqui voce acompanha seu P&L, equity curve e resumo geral das suas operacoes.",
    sidebarTarget: "sidebar-dashboard",
    mobileTarget: "mobile-dashboard",
  },
  {
    id: "journal",
    title: "Trade Journal",
    description:
      "Importe operacoes do MT5/cTrader e analise cada trade em detalhe.",
    sidebarTarget: "sidebar-journal",
    mobileTarget: "mobile-journal",
  },
  {
    id: "macro",
    title: "Inteligencia Macro",
    description:
      "Calendario economico, headlines ao vivo e briefing semanal com IA.",
    sidebarTarget: "sidebar-macro",
    mobileTarget: "mobile-macro",
  },
  {
    id: "analyst",
    title: "Analista Dexter",
    description:
      "Research completo com 30+ confluencias tecnicas e IA multi-agente.",
    sidebarTarget: "sidebar-analyst",
    mobileTarget: "mobile-analyst",
  },
  {
    id: "ai-coach",
    title: "AI Coach",
    description:
      "Seu analista pessoal que conhece todo seu historico de trading.",
    sidebarTarget: "sidebar-ai-coach",
    mobileTarget: "mobile-ai-coach",
  },
  {
    id: "conclusion",
    title: "Pronto!",
    description:
      "Comece importando suas operacoes ou explore a plataforma livremente.",
    centered: true,
  },
];

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

type TooltipPosition = "right" | "left" | "top" | "bottom";

function getTooltipPosition(
  rect: SpotlightRect,
  isMobile: boolean
): TooltipPosition {
  if (isMobile) return "top";
  // Desktop sidebar is on the left, so tooltip goes right
  if (rect.left < window.innerWidth / 2) return "right";
  return "left";
}

function getTooltipStyle(
  rect: SpotlightRect,
  position: TooltipPosition
): React.CSSProperties {
  const OFFSET = 16;
  const TOOLTIP_WIDTH = 320;

  switch (position) {
    case "right":
      return {
        top: rect.top + rect.height / 2,
        left: rect.left + rect.width + OFFSET,
        transform: "translateY(-50%)",
        maxWidth: TOOLTIP_WIDTH,
      };
    case "left":
      return {
        top: rect.top + rect.height / 2,
        right: window.innerWidth - rect.left + OFFSET,
        transform: "translateY(-50%)",
        maxWidth: TOOLTIP_WIDTH,
      };
    case "top":
      return {
        bottom: window.innerHeight - rect.top + OFFSET,
        left: rect.left + rect.width / 2,
        transform: "translateX(-50%)",
        maxWidth: TOOLTIP_WIDTH,
      };
    case "bottom":
      return {
        top: rect.top + rect.height + OFFSET,
        left: rect.left + rect.width / 2,
        transform: "translateX(-50%)",
        maxWidth: TOOLTIP_WIDTH,
      };
  }
}

export function OnboardingTour({ onComplete }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<SpotlightRect | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const step = TOUR_STEPS[currentStep];

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Find and measure target element
  const measureTarget = useCallback(() => {
    if (!step) return;
    if (step.centered) {
      setTargetRect(null);
      return;
    }

    const tourId = isMobile ? step.mobileTarget : step.sidebarTarget;
    if (!tourId) {
      setTargetRect(null);
      return;
    }

    const el = document.querySelector(`[data-tour-id="${tourId}"]`);
    if (!el) {
      setTargetRect(null);
      return;
    }

    const rect = el.getBoundingClientRect();
    const padding = 6;
    setTargetRect({
      top: rect.top - padding,
      left: rect.left - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    });
  }, [step, isMobile]);

  useEffect(() => {
    measureTarget();
    window.addEventListener("resize", measureTarget);
    window.addEventListener("scroll", measureTarget, true);
    return () => {
      window.removeEventListener("resize", measureTarget);
      window.removeEventListener("scroll", measureTarget, true);
    };
  }, [measureTarget]);

  const handleNext = useCallback(() => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      onComplete();
    }
  }, [currentStep, onComplete]);

  const handleSkip = useCallback(() => {
    onComplete();
  }, [onComplete]);

  const handleImportNow = useCallback(() => {
    onComplete();
    window.location.href = "/app/journal";
  }, [onComplete]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleSkip();
      if (e.key === "ArrowRight" || e.key === "Enter") handleNext();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handleSkip]);

  if (!step) return null;

  const isLastStep = currentStep === TOUR_STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        ref={overlayRef}
        key="tour-overlay"
        className="fixed inset-0 z-[9999]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: easeApple }}
      >
        {/* Overlay with spotlight cutout */}
        <svg
          className="absolute inset-0 h-full w-full"
          style={{ pointerEvents: "auto" }}
          onClick={(e) => {
            // Don't close when clicking the spotlight area
            if (targetRect) {
              const x = e.clientX;
              const y = e.clientY;
              if (
                x >= targetRect.left &&
                x <= targetRect.left + targetRect.width &&
                y >= targetRect.top &&
                y <= targetRect.top + targetRect.height
              ) {
                return;
              }
            }
          }}
        >
          <defs>
            <mask id="tour-spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {targetRect && (
                <motion.rect
                  x={targetRect.left}
                  y={targetRect.top}
                  width={targetRect.width}
                  height={targetRect.height}
                  rx="12"
                  ry="12"
                  fill="black"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, ease: easeApple }}
                />
              )}
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.6)"
            mask="url(#tour-spotlight-mask)"
          />
        </svg>

        {/* Spotlight border ring */}
        {targetRect && (
          <motion.div
            className="absolute rounded-xl pointer-events-none"
            style={{
              top: targetRect.top,
              left: targetRect.left,
              width: targetRect.width,
              height: targetRect.height,
              boxShadow: "0 0 0 2px hsl(var(--primary) / 0.5), 0 0 20px 4px hsl(var(--primary) / 0.15)",
            }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: easeApple }}
          />
        )}

        {/* Tooltip / Centered Modal */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            className="absolute z-10"
            style={
              step.centered
                ? {
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    maxWidth: 400,
                    width: "calc(100% - 48px)",
                  }
                : targetRect
                  ? getTooltipStyle(
                      targetRect,
                      getTooltipPosition(targetRect, isMobile)
                    )
                  : {
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      maxWidth: 400,
                      width: "calc(100% - 48px)",
                    }
            }
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.3, ease: easeApple }}
          >
            <div
              className="rounded-[18px] border border-border/60 p-6 shadow-xl"
              style={{ backgroundColor: "hsl(var(--card))" }}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold tracking-tight text-foreground">
                  {step.title}
                </h3>
                {!isLastStep && (
                  <button
                    onClick={handleSkip}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors -mt-1 -mr-1 shrink-0"
                    aria-label="Pular tour"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                {step.description}
              </p>

              {/* Progress dots */}
              <div className="flex items-center gap-1.5 mb-5">
                {TOUR_STEPS.map((_, i) => (
                  <div
                    key={i}
                    className="h-1.5 rounded-full transition-all duration-300"
                    style={{
                      width: i === currentStep ? 20 : 6,
                      backgroundColor:
                        i === currentStep
                          ? "hsl(var(--primary))"
                          : i < currentStep
                            ? "hsl(var(--primary) / 0.4)"
                            : "hsl(var(--muted-foreground) / 0.2)",
                    }}
                  />
                ))}
              </div>

              {/* Actions */}
              {isLastStep ? (
                <div className="flex gap-3">
                  <button
                    onClick={handleImportNow}
                    className="flex-1 flex items-center justify-center gap-2 rounded-[14px] py-3 text-sm font-semibold transition-all duration-200"
                    style={{
                      backgroundColor: "hsl(var(--foreground))",
                      color: "hsl(var(--background))",
                    }}
                  >
                    <BookOpen className="h-4 w-4" />
                    Importar agora
                  </button>
                  <button
                    onClick={handleSkip}
                    className="flex-1 flex items-center justify-center gap-2 rounded-[14px] py-3 text-sm font-medium border transition-all duration-200"
                    style={{
                      borderColor: "hsl(var(--border))",
                      color: "hsl(var(--foreground))",
                    }}
                  >
                    <Sparkles className="h-4 w-4" />
                    Explorar
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <button
                    onClick={handleSkip}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors py-2 px-1"
                  >
                    Pular tour
                  </button>
                  <button
                    onClick={handleNext}
                    className="flex items-center gap-2 rounded-[14px] px-5 py-2.5 text-sm font-semibold transition-all duration-200"
                    style={{
                      backgroundColor: "hsl(var(--foreground))",
                      color: "hsl(var(--background))",
                    }}
                  >
                    {isFirstStep ? "Comecar" : "Proximo"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
