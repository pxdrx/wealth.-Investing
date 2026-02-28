import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const mockAlerts = [
  { id: 1, asset: "PETR4", condition: "Acima de R$ 38,50", status: "active" as const },
  { id: 2, asset: "VALE3", condition: "Volume 2x média", status: "triggered" as const },
  { id: 3, asset: "ITUB4", condition: "Abaixo de R$ 32,00", status: "active" as const },
  { id: 4, asset: "BBDC4", condition: "Rompeu suporte", status: "triggered" as const },
  { id: 5, asset: "WEGE3", condition: "Acima de R$ 42,00", status: "pending" as const },
];

const mockWatchlist = [
  { symbol: "PETR4", name: "Petrobras", change: 2.34 },
  { symbol: "VALE3", name: "Vale", change: -0.89 },
  { symbol: "ITUB4", name: "Itaú", change: 1.12 },
  { symbol: "BBDC4", name: "Bradesco", change: -0.45 },
  { symbol: "WEGE3", name: "WEG", change: 3.21 },
  { symbol: "RENT3", name: "Localiza", change: 0.67 },
];

const mockNews = [
  { title: "Fed sinaliza manutenção de juros em reunião", source: "Reuters", time: "14:30" },
  { title: "Ibovespa fecha em alta com commodities", source: "Infomoney", time: "18:00" },
  { title: "Dólar recua frente ao real após dados de emprego", source: "Valor", time: "12:15" },
  { title: "Europa abre em queda com foco em inflação", source: "Bloomberg", time: "09:45" },
  { title: "Petrobras anuncia dividendos; ações sobem", source: "Reuters", time: "11:20" },
  { title: "Tesouro direto atrai R$ 2 bi em janeiro", source: "Valor", time: "08:00" },
];

const mockJournalKpis = [
  { label: "Winrate", value: "62%" },
  { label: "Payoff", value: "1.4" },
  { label: "Expectativa", value: "R$ 120" },
  { label: "# Trades", value: "47" },
];

function AlertBadge({ status }: { status: "active" | "triggered" | "pending" }) {
  const map = {
    active: <Badge variant="success">Ativo</Badge>,
    triggered: <Badge variant="secondary">Disparado</Badge>,
    pending: <Badge variant="outline">Pendente</Badge>,
  };
  return map[status];
}

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight-apple leading-tight-apple text-foreground">
          Trading Dashboard
        </h1>
        <p className="mt-1 text-muted-foreground leading-relaxed-apple">
          Visão geral dos seus alertas, watchlist, notícias e journal.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* 1) Alertas recentes — 5 itens + badges */}
        <Card className="lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-base font-medium">
              Alertas recentes
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-muted-foreground -mr-2" asChild>
              <Link href="/app/alerts">Ver tudo</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {mockAlerts.map((alert, index) => (
                <li key={alert.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {alert.asset}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {alert.condition}
                      </p>
                    </div>
                    <AlertBadge status={alert.status} />
                  </div>
                  {index < mockAlerts.length - 1 && (
                    <Separator className="mt-3" />
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* 2) Watchlist — tabela 6 ativos + variação % */}
        <Card className="lg:col-span-8">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-base font-medium">
              Watchlist
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-muted-foreground -mr-2" asChild>
              <Link href="/app">Ver tudo</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Ativo</TableHead>
                  <TableHead className="text-muted-foreground">Nome</TableHead>
                  <TableHead className="text-right text-muted-foreground">
                    Var. dia %
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockWatchlist.map((row) => (
                  <TableRow key={row.symbol}>
                    <TableCell className="font-medium">{row.symbol}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.name}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium ${
                        row.change >= 0 ? "text-emerald-800 dark:text-emerald-500" : "text-red-800 dark:text-red-500"
                      }`}
                    >
                      {row.change >= 0 ? "+" : ""}
                      {row.change}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 3) News — 6 manchetes + fonte/horário */}
        <Card className="lg:col-span-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-base font-medium">
              News
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-muted-foreground -mr-2" asChild>
              <Link href="/app/news">Ver tudo</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {mockNews.map((item, i) => (
                <li key={i}>
                  <p className="text-sm font-medium text-foreground leading-snug">
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.source} · {item.time}
                  </p>
                  {i < mockNews.length - 1 && <Separator className="mt-3" />}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* 4) Resumo do Journal — KPIs */}
        <Card className="lg:col-span-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-base font-medium">
              Resumo do Journal
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-muted-foreground -mr-2" asChild>
              <Link href="/app/journal">Ver tudo</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              {mockJournalKpis.map((kpi) => (
                <div key={kpi.label} className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {kpi.label}
                  </p>
                  <p className="kpi-value text-xl">
                    {kpi.value}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 5) Calendário — placeholder */}
        <Card className="lg:col-span-12">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-base font-medium">
              Calendário
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex min-h-[180px] items-center justify-center rounded-input border border-dashed border-border/80 bg-muted/20">
              <p className="text-sm text-muted-foreground">
                Heatmap em breve
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
