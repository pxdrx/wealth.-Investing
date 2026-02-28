import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function RiskDisclaimerPage() {
  return (
    <section className="mx-auto max-w-2xl px-6 py-24">
      <h1 className="text-2xl font-semibold tracking-tight-apple leading-tight-apple text-foreground">
        Aviso de risco
      </h1>
      <p className="mt-6 leading-relaxed-apple text-muted-foreground">
        Trading e investimentos envolvem riscos, incluindo a possível perda do
        capital. O conteúdo deste produto tem caráter informativo e não
        constitui aconselhamento financeiro. Consulte um profissional
        qualificado antes de tomar decisões de investimento.
      </p>
      <div className="mt-10">
        <Button asChild variant="outline">
          <Link href="/">Voltar</Link>
        </Button>
      </div>
    </section>
  );
}
