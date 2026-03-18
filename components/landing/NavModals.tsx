"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  LayoutDashboard,
  BookOpen,
  BarChart3,
  CalendarDays,
  ShieldCheck,
  Upload,
  Brain,
  Target,
  TrendingUp,
  Wallet,
  AlertTriangle,
  FileBarChart,
  DollarSign,
} from "lucide-react";

/* ── Types ─────────────────────────────────────────────────── */
export type NavModal = "plataforma" | "recursos" | "mesas" | null;

interface NavModalsProps {
  open: NavModal;
  onOpenChange: (modal: NavModal) => void;
}

/* ── Bullet item ───────────────────────────────────────────── */
interface BulletProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function Bullet({ icon, title, description }: BulletProps) {
  return (
    <div className="flex gap-3">
      <div
        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{
          backgroundColor: "hsl(var(--landing-accent) / 0.1)",
          color: "hsl(var(--landing-accent))",
        }}
      >
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

/* ── Plataforma ────────────────────────────────────────────── */
function PlataformaContent() {
  return (
    <div className="space-y-4">
      <Bullet
        icon={<LayoutDashboard className="h-4 w-4" />}
        title="Dashboard Inteligente"
        description="Visão consolidada de P&L, win rate, profit factor e métricas-chave em tempo real."
      />
      <Bullet
        icon={<BookOpen className="h-4 w-4" />}
        title="Journal de Trades"
        description="Registre cada operação com contexto: setup, emoção, qualidade de execução e notas."
      />
      <Bullet
        icon={<BarChart3 className="h-4 w-4" />}
        title="Analytics Profundo"
        description="Sharpe, Sortino, MFE/MAE, equity curve, heatmaps por hora e sessão de mercado."
      />
      <Bullet
        icon={<CalendarDays className="h-4 w-4" />}
        title="Calendário P&L"
        description="Visualize seus resultados dia a dia com heatmap de cores e detalhes por clique."
      />
      <Bullet
        icon={<ShieldCheck className="h-4 w-4" />}
        title="Gestão de Risco"
        description="Drawdown tracking, alertas de limite diário e regras personalizadas por conta."
      />
    </div>
  );
}

/* ── Recursos ──────────────────────────────────────────────── */
function RecursosContent() {
  return (
    <div className="space-y-4">
      <Bullet
        icon={<Upload className="h-4 w-4" />}
        title="Import Automático MT5/cTrader"
        description="Importe relatórios HTML ou XLSX direto da plataforma. Detecção automática de duplicatas."
      />
      <Bullet
        icon={<Brain className="h-4 w-4" />}
        title="AI Coach"
        description="Analista de mercado com IA que cruza suas estatísticas, contexto macro e sentimento da plataforma."
      />
      <Bullet
        icon={<Target className="h-4 w-4" />}
        title="Análise MFE/MAE"
        description="Descubra quanto lucro você deixa na mesa e otimize seus pontos de saída com dados reais."
      />
      <Bullet
        icon={<TrendingUp className="h-4 w-4" />}
        title="Equity Curve e Drawdown"
        description="Acompanhe a evolução do seu capital e identifique períodos de drawdown em gráficos interativos."
      />
      <Bullet
        icon={<CalendarDays className="h-4 w-4" />}
        title="Psychology Tags"
        description="Marque emoção e disciplina em cada trade. Identifique padrões emocionais que afetam seu P&L."
      />
    </div>
  );
}

/* ── Para Mesas ────────────────────────────────────────────── */
function MesasContent() {
  return (
    <div className="space-y-4">
      <Bullet
        icon={<Wallet className="h-4 w-4" />}
        title="Multi-conta"
        description="Gerencie múltiplas contas de mesa proprietária no mesmo painel com visão consolidada."
      />
      <Bullet
        icon={<AlertTriangle className="h-4 w-4" />}
        title="Drawdown Tracking"
        description="Acompanhe drawdown diário e total em tempo real. Alertas antes de violar regras da mesa."
      />
      <Bullet
        icon={<ShieldCheck className="h-4 w-4" />}
        title="Alertas de Risco"
        description="Notificações quando se aproximar de limites de perda diária, drawdown máximo ou número de trades."
      />
      <Bullet
        icon={<FileBarChart className="h-4 w-4" />}
        title="Relatórios de Performance"
        description="Métricas exigidas pelas mesas: profit factor, consistency score, max drawdown e mais."
      />
      <Bullet
        icon={<DollarSign className="h-4 w-4" />}
        title="Payouts Tracking"
        description="Registre e acompanhe seus payouts por conta. Saiba exatamente quanto já sacou de cada mesa."
      />
    </div>
  );
}

/* ── Main Component ────────────────────────────────────────── */
export function NavModals({ open, onOpenChange }: NavModalsProps) {
  const handleClose = () => onOpenChange(null);

  const modalConfig = {
    plataforma: {
      title: "Uma plataforma completa para traders",
      description: "Tudo que você precisa para registrar, analisar e evoluir como trader.",
      content: <PlataformaContent />,
      ctaLabel: "Comece grátis",
      ctaHref: "/login",
    },
    recursos: {
      title: "Recursos que fazem a diferença",
      description: "Ferramentas exclusivas para quem leva trading a sério.",
      content: <RecursosContent />,
      ctaLabel: "Explorar recursos",
      ctaHref: "/#registre",
    },
    mesas: {
      title: "Feito para quem opera mesa proprietária",
      description: "Ferramentas específicas para prop traders que precisam de controle total.",
      content: <MesasContent />,
      ctaLabel: "Ver planos para mesas",
      ctaHref: "/#precos",
    },
  } as const;

  return (
    <>
      {(["plataforma", "recursos", "mesas"] as const).map((key) => {
        const cfg = modalConfig[key];
        return (
          <Dialog key={key} open={open === key} onOpenChange={(v) => !v && handleClose()}>
            <DialogContent
              className="max-w-[520px] max-h-[85vh] overflow-hidden flex flex-col"
              style={{ backgroundColor: "hsl(var(--card))" }}
            >
              <DialogHeader>
                <DialogTitle className="text-lg">{cfg.title}</DialogTitle>
                <DialogDescription>{cfg.description}</DialogDescription>
              </DialogHeader>
              <div className="overflow-y-auto flex-1 pr-2 -mr-2 py-2">
                {cfg.content}
              </div>
              <div className="pt-3 border-t" style={{ borderColor: "hsl(var(--border))" }}>
                <a
                  href={cfg.ctaHref}
                  className="flex w-full items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium transition-all hover:scale-[1.02]"
                  style={{
                    backgroundColor: "hsl(var(--landing-accent))",
                    color: "hsl(var(--landing-bg))",
                  }}
                >
                  {cfg.ctaLabel}
                </a>
              </div>
            </DialogContent>
          </Dialog>
        );
      })}
    </>
  );
}
