type Day = { d: number; p?: string; tone?: "pos" | "neg" };
const DAYS: Day[] = [
  { d: 23 }, { d: 24 }, { d: 25 }, { d: 26 }, { d: 27 }, { d: 28 }, { d: 1 },
  { d: 2, p: "+$890", tone: "pos" }, { d: 3, p: "+$1.2k", tone: "pos" },
  { d: 4, p: "-$2k", tone: "neg" }, { d: 5, p: "-$330", tone: "neg" },
  { d: 6, p: "+$1.3k", tone: "pos" }, { d: 7 }, { d: 8 },
  { d: 9, p: "-$2k", tone: "neg" }, { d: 10, p: "-$2k", tone: "neg" },
  { d: 11, p: "+$1.4k", tone: "pos" }, { d: 12, p: "-$260", tone: "neg" },
  { d: 13, p: "+$1.6k", tone: "pos" }, { d: 14 }, { d: 15 },
  { d: 16, p: "+$1.1k", tone: "pos" }, { d: 17, p: "-$480", tone: "neg" },
  { d: 18, p: "+$1.4k", tone: "pos" }, { d: 19, p: "-$200", tone: "neg" },
  { d: 20, p: "-$620", tone: "neg" }, { d: 21 }, { d: 22 },
];

const ACCOUNTS = ["Todas", "Fimathe XAU 3am", "Fimathe XAU", "Fimathe S&P"];

export function BacktestPanel() {
  return (
    <div className="h-full flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[12px] font-semibold text-zinc-900">Backtest</div>
          <div className="text-[9px] text-zinc-500">3 contas · 34 trades</div>
        </div>
      </div>
      <div className="flex gap-1 flex-wrap">
        {ACCOUNTS.map((a, i) => (
          <span
            key={a}
            className={
              i === 0
                ? "rounded-full px-2 py-0.5 text-[9px] font-medium bg-violet-100 text-violet-700 border border-violet-200"
                : "rounded-full px-2 py-0.5 text-[9px] text-zinc-600 border border-zinc-200 bg-white"
            }
          >
            {a}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-6 gap-1">
        <BtKpi l="P&L" v="-$1.680" tone="red" />
        <BtKpi l="Win rate" v="55.9%" />
        <BtKpi l="PF" v="0.88" />
        <BtKpi l="Trades" v="19W/15L" />
        <BtKpi l="Max DD" v="-$5.080" tone="red" />
        <BtKpi l="Total" v="34" />
      </div>
      <div className="rounded-lg border border-zinc-100 bg-white p-2">
        <div className="flex justify-between items-center mb-1.5">
          <div className="text-[10px] font-semibold text-zinc-900">‹ Março 2026 ›</div>
          <div className="text-[9px] font-semibold text-red-600">P&L: -$1.7k</div>
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {DAYS.map((d, i) => (
            <div
              key={i}
              className={
                "aspect-[1.4] rounded px-1 py-0.5 text-[7px] flex flex-col justify-between border " +
                (d.tone === "pos"
                  ? "bg-emerald-100 border-emerald-200"
                  : d.tone === "neg"
                  ? "bg-red-100 border-red-200"
                  : "bg-zinc-50 border-zinc-100")
              }
            >
              <div className="text-zinc-500">{d.d}</div>
              {d.p && (
                <div
                  className={
                    "font-semibold text-[7px] " +
                    (d.tone === "pos" ? "text-emerald-700" : "text-red-700")
                  }
                >
                  {d.p}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BtKpi({ l, v, tone }: { l: string; v: string; tone?: "red" | "green" }) {
  const color = tone === "red" ? "text-red-600" : tone === "green" ? "text-emerald-600" : "text-zinc-900";
  return (
    <div className="rounded bg-white border border-zinc-100 px-1.5 py-1">
      <div className="text-[7px] uppercase tracking-wider text-zinc-400">{l}</div>
      <div className={`text-[11px] font-semibold mt-0.5 ${color}`}>{v}</div>
    </div>
  );
}
