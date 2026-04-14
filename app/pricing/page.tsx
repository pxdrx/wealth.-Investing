import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Preços · wealth.Investing",
  description:
    "Planos do wealth.Investing — comece grátis, faça upgrade quando quiser. Sem contrato, sem taxa de cancelamento.",
};

type Tier = {
  id: "free" | "pro" | "ultra";
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
  badge?: string;
};

const TIERS: Tier[] = [
  {
    id: "free",
    name: "Grátis",
    price: "R$0",
    period: "/mês",
    description: "Comece a registrar. Sem compromisso.",
    features: [
      "10 trades por mês",
      "1 conta",
      "3 consultas IA Coach/mês",
      "Journal básico",
      "Import MT5",
      "Calendário econômico",
    ],
    cta: "Começar grátis",
  },
  {
    id: "pro",
    name: "Pro",
    price: "R$29,90",
    period: "/mês",
    description: "Seus dados, sua análise. Você no controle total.",
    features: [
      "Trades ilimitados",
      "5 contas simultâneas",
      "15 consultas IA Coach/mês",
      "Journal completo + tags",
      "Macroeconomia completa",
      "Headlines ao vivo",
      "Briefing macroeconômico",
      "Dashboard completo",
      "Relatórios de performance",
      "Export CSV",
    ],
    cta: "Começar com Pro",
    highlighted: true,
    badge: "Mais popular",
  },
  {
    id: "ultra",
    name: "Ultra",
    price: "R$49,90",
    period: "/mês",
    description: "Seu copiloto de trading. IA que analisa, aponta erros e te faz evoluir.",
    features: [
      "Tudo do Pro, mais:",
      "Contas ilimitadas",
      "15 consultas IA Coach/dia",
      "Psicologia e tags avançadas",
      "Comparação de contas",
      "Alertas customizados",
      "Relatórios avançados",
      "Export PDF",
      "Dexter ilimitado",
      "Suporte prioritário",
    ],
    cta: "Começar com Ultra",
    badge: "Mais resultados",
  },
];

export default function PricingPage() {
  return (
    <div className="relative min-h-screen bg-zinc-50 text-zinc-900">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:p-4"
      >
        Pular para o conteúdo
      </a>
      <Navbar />
      <main id="main-content">
        <section className="py-16 lg:py-24">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center mb-12 lg:mb-16">
              <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium mb-3">
                Preços
              </div>
              <h1 className="text-[32px] lg:text-[48px] font-semibold leading-tight tracking-tight text-zinc-900 mb-4">
                Planos simples.{" "}
                <span className="text-zinc-500 italic font-normal">Sem surpresa.</span>
              </h1>
              <p className="text-[14px] lg:text-[16px] text-zinc-600 max-w-xl mx-auto">
                Comece grátis. Faça upgrade quando quiser — sem contrato, sem taxa de cancelamento.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
              {TIERS.map((t) => (
                <div
                  key={t.id}
                  className={
                    "relative rounded-[22px] border p-6 lg:p-8 flex flex-col " +
                    (t.highlighted
                      ? "bg-zinc-900 text-white border-zinc-900 shadow-xl lg:scale-[1.02]"
                      : "bg-white text-zinc-900 border-zinc-200")
                  }
                >
                  {t.badge && (
                    <span
                      className={
                        "absolute -top-3 left-6 text-[9px] uppercase tracking-wider font-semibold rounded-full px-2.5 py-1 " +
                        (t.highlighted
                          ? "bg-violet-500 text-white"
                          : "bg-zinc-100 text-zinc-700 border border-zinc-200")
                      }
                    >
                      {t.badge}
                    </span>
                  )}
                  <div className="mb-4">
                    <div className="text-[14px] font-semibold mb-1">{t.name}</div>
                    <p
                      className={
                        "text-[12px] leading-snug " +
                        (t.highlighted ? "text-zinc-400" : "text-zinc-600")
                      }
                    >
                      {t.description}
                    </p>
                  </div>
                  <div className="flex items-baseline gap-1 mb-5">
                    <span className="text-[32px] font-semibold tracking-tight">{t.price}</span>
                    <span className={t.highlighted ? "text-zinc-400" : "text-zinc-500"}>
                      {t.period}
                    </span>
                  </div>
                  <Link
                    href="/login"
                    className={
                      "inline-flex items-center justify-center rounded-full px-5 py-2.5 text-[12px] font-medium transition-colors min-h-[44px] mb-6 " +
                      (t.highlighted
                        ? "bg-white text-zinc-900 hover:bg-zinc-100"
                        : "bg-zinc-900 text-white hover:bg-zinc-800")
                    }
                  >
                    {t.cta}
                  </Link>
                  <ul className="space-y-2.5 flex-1">
                    {t.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-[13px] leading-snug">
                        <Check
                          className={
                            "w-4 h-4 shrink-0 mt-0.5 " +
                            (t.highlighted ? "text-emerald-400" : "text-emerald-600")
                          }
                        />
                        <span className={t.highlighted ? "text-zinc-200" : "text-zinc-700"}>
                          {f}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-16 text-center">
              <p className="text-[13px] text-zinc-500">
                Dúvidas sobre qual plano escolher?{" "}
                <Link href="/login" className="text-zinc-900 font-medium hover:underline">
                  Comece grátis
                </Link>{" "}
                — você pode fazer upgrade a qualquer momento.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
