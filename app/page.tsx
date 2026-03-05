import Link from "next/link";
import { BrandMark } from "@/components/brand/BrandMark";

export default function HomePage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <BrandMark size="xl" />
      <div className="mt-10 flex flex-col sm:flex-row items-center gap-3">
        <Link
          href="/onboarding"
          className="inline-flex items-center justify-center rounded-full bg-foreground px-8 py-3 text-sm font-medium text-background transition-opacity hover:opacity-80"
        >
          Onboarding
        </Link>
        <Link
          href="/risk-disclaimer"
          className="inline-flex items-center justify-center rounded-full border border-border px-8 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
        >
          Aviso de risco
        </Link>
      </div>
    </div>
  );
}
