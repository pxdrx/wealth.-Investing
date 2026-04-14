import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { PricingCards } from "@/components/billing/PricingCards";

export const metadata: Metadata = {
  title: "Preços · wealth.Investing",
  description:
    "Planos do wealth.Investing — comece grátis, faça upgrade quando quiser. Sem contrato, sem taxa de cancelamento.",
};

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

            <PricingCards />

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
