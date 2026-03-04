import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand/BrandMark";

export default function LandingPage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24 text-center sm:py-32">
      <div>
        <BrandMark size="base" />
      </div>
      <p className="mt-4 text-lg leading-relaxed-apple">
        <span className="text-muted-foreground">Suas notícias, seu journal, sua wallet, </span>
        <span className="text-foreground">seu tudo.</span>
      </p>
      <h1 className="mt-5 text-4xl font-semibold tracking-tight-apple leading-tight-apple text-foreground sm:text-5xl">
        Tudo que você precisa em um só lugar
      </h1>
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
