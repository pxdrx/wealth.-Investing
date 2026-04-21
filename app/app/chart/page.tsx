"use client";

import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  Bitcoin,
  CircleDollarSign,
  Flame,
  Gem,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

const QUICK_ASSETS = [
  { label: "EUR/USD", symbol: "FX:EURUSD", icon: CircleDollarSign },
  { label: "Ouro", symbol: "TVC:GOLD", icon: Gem },
  { label: "BTC", symbol: "BITSTAMP:BTCUSD", icon: Bitcoin },
  { label: "Petróleo", symbol: "TVC:USOIL", icon: Flame },
  { label: "Brent", symbol: "TVC:UKOIL", icon: Flame },
  { label: "Nasdaq", symbol: "PEPPERSTONE:NAS100", icon: BarChart3 },
  { label: "DXY", symbol: "CAPITALCOM:DXY", icon: CircleDollarSign },
] as const;

export default function ChartPage() {
  const { resolvedTheme } = useTheme();
  const tvTheme = resolvedTheme === "dark" ? "dark" : "light";
  const [chartSymbol, setChartSymbol] = useState<string>("FX:EURUSD");
  const containerRef = useRef<HTMLDivElement>(null);
  const [iframeReady, setIframeReady] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIframeReady(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Gráfico</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ticker + chart avançado em tempo real.
        </p>
      </div>

      {/* Ticker tape */}
      <div
        className="w-full rounded-xl border border-border/40 overflow-hidden shadow-sm isolate"
        style={{ backgroundColor: "hsl(var(--card))" }}
      >
        <iframe
          key={`ticker-${tvTheme}`}
          src={
            "https://s.tradingview.com/embed-widget/ticker-tape/?locale=br#" +
            encodeURIComponent(
              JSON.stringify({
                symbols: [
                  { proName: "FX:EURUSD", title: "EUR/USD" },
                  { proName: "FX:GBPUSD", title: "GBP/USD" },
                  { proName: "FX:USDJPY", title: "USD/JPY" },
                  { proName: "PEPPERSTONE:NAS100", title: "Nasdaq 100" },
                  { proName: "PEPPERSTONE:US500", title: "S&P 500" },
                  { proName: "PEPPERSTONE:US30", title: "Dow Jones" },
                  { proName: "OANDA:XAUUSD", title: "Ouro" },
                  { proName: "OANDA:WTICOUSD", title: "WTI Oil" },
                  { proName: "OANDA:NATGASUSD", title: "Gás Natural" },
                  { proName: "COINBASE:BTCUSD", title: "Bitcoin" },
                  { proName: "COINBASE:ETHUSD", title: "Ethereum" },
                ],
                showSymbolLogo: true,
                isTransparent: true,
                displayMode: "adaptive",
                colorTheme: tvTheme,
              }),
            )
          }
          style={{ width: "100%", height: "46px", border: "none" }}
          loading="lazy"
        />
      </div>

      {/* Quick asset buttons */}
      <div className="flex gap-2 flex-wrap">
        {QUICK_ASSETS.map((asset) => {
          const Icon = asset.icon;
          const isActive = chartSymbol === asset.symbol;
          return (
            <button
              key={asset.symbol}
              onClick={() => setChartSymbol(asset.symbol)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all border",
                isActive
                  ? "bg-foreground text-background border-foreground shadow-sm"
                  : "border-border/60 text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              <Icon className="h-3 w-3" />
              {asset.label}
            </button>
          );
        })}
      </div>

      {/* Advanced chart */}
      <div
        ref={containerRef}
        className="w-full rounded-[22px] border border-border/40 overflow-hidden shadow-sm isolate"
        style={{ backgroundColor: "hsl(var(--card))" }}
      >
        {iframeReady ? (
          <iframe
            key={`chart-${tvTheme}-${chartSymbol}`}
            src={
              `https://s.tradingview.com/widgetembed/?frameElementId=tradingview_advanced&symbol=${encodeURIComponent(chartSymbol)}&interval=60` +
              "&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=f1f3f6" +
              "&hide_legend=0&hide_volume=0" +
              "&studies=%5B%22MAExp%4050%22%2C%22MAExp%40200%22%5D" +
              `&theme=${tvTheme}&style=1&timezone=America%2FSao_Paulo` +
              "&withdateranges=1&allow_symbol_change=1" +
              "&watchlist=FX%3AEURUSD%2CFX%3AGBPUSD%2CFX%3AUSDJPY%2CFX%3AUSDCAD%2COANDA%3AXAUUSD%2CCOINBASE%3ABTCUSD%2CPEPPERSTONE%3ANAS100%2CPEPPERSTONE%3AUS500" +
              "&details=1&calendar=1&hotlist=1" +
              "&locale=br"
            }
            style={{ width: "100%", height: "640px", border: "none" }}
            loading="lazy"
            allowFullScreen
          />
        ) : (
          <div
            className="flex items-center justify-center animate-pulse"
            style={{ height: "640px", backgroundColor: "hsl(var(--card))" }}
          >
            <p className="text-sm text-muted-foreground">Carregando gráfico…</p>
          </div>
        )}
      </div>
    </div>
  );
}
