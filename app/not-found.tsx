import { FileQuestion } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
      <div
        className="mx-auto w-full max-w-md rounded-[22px] p-8 text-center shadow-soft dark:shadow-soft-dark"
        style={{ backgroundColor: "hsl(var(--card))" }}
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <FileQuestion className="h-6 w-6 text-muted-foreground" />
        </div>

        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Pagina nao encontrada
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          A pagina que voce procura nao existe ou foi movida.
        </p>

        <div className="mt-6">
          <Link
            href="/"
            className="inline-block rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar ao inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
