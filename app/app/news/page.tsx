import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NewsPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight-apple leading-tight-apple text-foreground">
        News
      </h1>
      <p className="mt-2 text-muted-foreground leading-relaxed-apple">
        Notícias e manchetes dos mercados.
      </p>
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Em breve</CardTitle>
          <CardDescription>
            Esta página será preenchida com feed de notícias.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Placeholder: feed de notícias por ativo e fonte.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
