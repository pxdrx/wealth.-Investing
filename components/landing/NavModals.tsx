"use client";

import { useTranslations } from "next-intl";
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

/* ── Shape definitions (translation-key-driven) ────────────── */
type ItemDef = { icon: React.ReactNode; key: string };

const PLATAFORMA_ITEMS: ItemDef[] = [
  { icon: <LayoutDashboard className="h-4 w-4" />, key: "dashboard" },
  { icon: <BookOpen className="h-4 w-4" />, key: "journal" },
  { icon: <BarChart3 className="h-4 w-4" />, key: "analytics" },
  { icon: <CalendarDays className="h-4 w-4" />, key: "calendar" },
  { icon: <ShieldCheck className="h-4 w-4" />, key: "risk" },
];

const RECURSOS_ITEMS: ItemDef[] = [
  { icon: <Upload className="h-4 w-4" />, key: "import" },
  { icon: <Brain className="h-4 w-4" />, key: "aiCoach" },
  { icon: <Target className="h-4 w-4" />, key: "mfeMae" },
  { icon: <TrendingUp className="h-4 w-4" />, key: "equity" },
  { icon: <CalendarDays className="h-4 w-4" />, key: "psychology" },
];

const MESAS_ITEMS: ItemDef[] = [
  { icon: <Wallet className="h-4 w-4" />, key: "multiAccount" },
  { icon: <AlertTriangle className="h-4 w-4" />, key: "drawdown" },
  { icon: <ShieldCheck className="h-4 w-4" />, key: "riskAlerts" },
  { icon: <FileBarChart className="h-4 w-4" />, key: "reports" },
  { icon: <DollarSign className="h-4 w-4" />, key: "payouts" },
];

function Section({ namespace, items }: { namespace: string; items: ItemDef[] }) {
  const t = useTranslations(namespace);
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <Bullet
          key={item.key}
          icon={item.icon}
          title={t(`items.${item.key}.title`)}
          description={t(`items.${item.key}.description`)}
        />
      ))}
    </div>
  );
}

/* ── Main Component ────────────────────────────────────────── */
export function NavModals({ open, onOpenChange }: NavModalsProps) {
  const t = useTranslations("navModals");
  const handleClose = () => onOpenChange(null);

  const modalConfig = {
    plataforma: {
      content: <Section namespace="navModals.plataforma" items={PLATAFORMA_ITEMS} />,
      ctaHref: "/login",
    },
    recursos: {
      content: <Section namespace="navModals.recursos" items={RECURSOS_ITEMS} />,
      ctaHref: "/#registre",
    },
    mesas: {
      content: <Section namespace="navModals.mesas" items={MESAS_ITEMS} />,
      ctaHref: "/pricing",
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
                <DialogTitle className="text-lg">{t(`${key}.title`)}</DialogTitle>
                <DialogDescription>{t(`${key}.description`)}</DialogDescription>
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
                  {t(`${key}.ctaLabel`)}
                </a>
              </div>
            </DialogContent>
          </Dialog>
        );
      })}
    </>
  );
}
