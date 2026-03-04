"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const mockEquity = { usd: 125_430.5, brl: 628_150.0 };
const mockPnL = {
  day: { value: 1_240.0, pct: 0.99 },
  week: { value: 3_820.5, pct: 3.04 },
  month: { value: 8_100.0, pct: 6.45 },
};

export default function WalletPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight-apple leading-tight-apple text-foreground">
          Wallet
        </h1>
        <p className="mt-1 text-muted-foreground leading-relaxed-apple">
          Equity, P&L e métricas de risco. Integração com journal e cotações em breve.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Equity — USD e BRL */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-base font-medium">Equity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="kpi-value text-2xl">${mockEquity.usd.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              R$ {mockEquity.brl.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        {/* P&L — Tabs Dia / Semana / Mês */}
        <Card className="lg:col-span-8">
          <CardHeader>
            <CardTitle className="text-base font-medium">P&L</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="day">
              <TabsList>
                <TabsTrigger value="day">Dia</TabsTrigger>
                <TabsTrigger value="week">Semana</TabsTrigger>
                <TabsTrigger value="month">Mês</TabsTrigger>
              </TabsList>
              <TabsContent value="day">
                <p className="kpi-value mt-4 text-xl text-emerald-800 dark:text-emerald-500">
                  +${mockPnL.day.value.toLocaleString("en-US", { minimumFractionDigits: 2 })} ({mockPnL.day.pct}%)
                </p>
              </TabsContent>
              <TabsContent value="week">
                <p className="kpi-value mt-4 text-xl text-emerald-800 dark:text-emerald-500">
                  +${mockPnL.week.value.toLocaleString("en-US", { minimumFractionDigits: 2 })} ({mockPnL.week.pct}%)
                </p>
              </TabsContent>
              <TabsContent value="month">
                <p className="kpi-value mt-4 text-xl text-emerald-800 dark:text-emerald-500">
                  +${mockPnL.month.value.toLocaleString("en-US", { minimumFractionDigits: 2 })} ({mockPnL.month.pct}%)
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Curva de Equity — placeholder */}
        <Card className="lg:col-span-8">
          <CardHeader>
            <CardTitle className="text-base font-medium">Curva de Equity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex min-h-[220px] items-center justify-center rounded-input border border-dashed border-border/80 bg-muted/20">
              <p className="text-sm text-muted-foreground">Chart em breve</p>
            </div>
          </CardContent>
        </Card>

        {/* Drawdown — placeholder */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-base font-medium">Drawdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex min-h-[140px] items-center justify-center rounded-input border border-dashed border-border/80 bg-muted/20">
              <p className="text-sm text-muted-foreground">Em breve</p>
            </div>
          </CardContent>
        </Card>

        {/* Taxa USD/BRL usada — placeholder */}
        <Card className="lg:col-span-12">
          <CardHeader>
            <CardTitle className="text-base font-medium">USD/BRL usado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex min-h-[80px] items-center justify-center rounded-input border border-dashed border-border/80 bg-muted/20">
              <p className="text-sm text-muted-foreground">Em breve</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
