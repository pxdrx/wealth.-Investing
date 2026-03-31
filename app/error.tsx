"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RootError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("Root error boundary caught:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
      <div
        className="mx-auto w-full max-w-md rounded-[22px] p-8 text-center shadow-soft dark:shadow-soft-dark"
        style={{ backgroundColor: "hsl(var(--card))" }}
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>

        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Algo deu errado
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          {error.message || "Ocorreu um erro inesperado."}
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={reset}
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar novamente
          </button>

          <Link
            href="/"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Voltar ao inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
