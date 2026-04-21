// [C-12] Ultra-only paywall card for MT5 live monitoring. Replaces the
// connect widget for users below Ultra tier.
"use client";

import Link from "next/link";
import { Activity, Lock } from "lucide-react";

export function LiveLockCard() {
  return (
    <div
      className="relative overflow-hidden rounded-[22px] border border-border/60 p-6 isolate"
      style={{ backgroundColor: "hsl(var(--card))" }}
    >
      <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 relative">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-500">
                Ultra
              </span>
              <Lock className="h-3 w-3 text-amber-500" />
            </div>
            <h3 className="text-base font-semibold tracking-tight text-foreground">
              Monitoramento MT5 ao Vivo
            </h3>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed max-w-lg">
              Acompanhe equity, drawdown e posições em tempo real pela MetaApi.
              Alertas adaptativos quando o risco sai do trilho. Exclusivo do plano Ultra.
            </p>
          </div>
        </div>
        <Link
          href="/app/subscription"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 whitespace-nowrap"
        >
          Upgrade para Ultra
        </Link>
      </div>
    </div>
  );
}
