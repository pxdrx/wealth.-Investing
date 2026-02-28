import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight-apple leading-tight-apple text-foreground">
        Settings
      </h1>
      <p className="mt-2 text-muted-foreground leading-relaxed-apple">
        Preferências e configurações da conta.
      </p>
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Em breve</CardTitle>
          <CardDescription>
            Esta página será preenchida com opções de configuração.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Placeholder: tema, notificações, integrações.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
