import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AlertsPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Alerts
      </h1>
      <p className="mt-2 text-muted-foreground">
        Configure e visualize seus alertas de preço e volume.
      </p>
      <Card className="mt-8 rounded-2xl">
        <CardHeader>
          <CardTitle>Em breve</CardTitle>
          <CardDescription>
            Esta página será preenchida com a gestão de alertas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Placeholder: listagem e criação de alertas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
