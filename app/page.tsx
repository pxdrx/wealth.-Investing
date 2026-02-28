import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24 text-center sm:py-32">
      <h1 className="text-4xl font-semibold tracking-tight-apple leading-tight-apple text-foreground sm:text-5xl">
        Tudo que você precisa em um só lugar
      </h1>
      <p className="mt-6 text-lg leading-relaxed-apple text-muted-foreground">
        Dashboard, alertas, notícias e journal integrados. Acompanhe seus ativos
        e decisões com clareza.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <Button asChild size="lg" className="px-8">
          <Link href="/app">Abrir Dashboard</Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="px-8">
          <Link href="/risk-disclaimer">Aviso de risco</Link>
        </Button>
      </div>
    </section>
  );
}
