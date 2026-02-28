import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function JournalPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Journal
      </h1>
      <p className="mt-2 text-muted-foreground">
        Registro de trades e análise de performance.
      </p>
      <Card className="mt-8 rounded-2xl">
        <CardHeader>
          <CardTitle>Em breve</CardTitle>
          <CardDescription>
            Esta página será preenchida com o journal de trades.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Placeholder: entradas, estatísticas e filtros.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
