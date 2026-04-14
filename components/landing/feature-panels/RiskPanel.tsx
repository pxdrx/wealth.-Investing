type Bar = { label: string; left: string; right: string; pct: number; tone: "red" | "green" | "gray" };

const BARS: Bar[] = [
  { label: "Drawdown diário", left: "-2.1%", right: "-5.0%", pct: 42, tone: "red" },
  { label: "Drawdown total", left: "-4.1%", right: "-10.0%", pct: 41, tone: "red" },
  { label: "Profit target", left: "+6.2%", right: "+8.0%", pct: 77, tone: "green" },
  { label: "Dias operados", left: "17", right: "30", pct: 57, tone: "gray" },
];

const BAR_COLOR: Record<Bar["tone"], string> = {
  red: "bg-red-600",
  green: "bg-emerald-600",
  gray: "bg-zinc-500",
};
const VALUE_COLOR: Record<Bar["tone"], string> = {
  red: "text-red-600",
  green: "text-emerald-600",
  gray: "text-zinc-900",
};

export function RiskPanel() {
  return (
    <div className="h-full flex flex-col gap-1.5">
      <div className="text-[10px] uppercase tracking-wider text-zinc-400 mb-1">
        Risk · The5ers 100k
      </div>
      {BARS.map((b) => (
        <div key={b.label} className="rounded-md border border-zinc-100 bg-white px-3 py-2.5">
          <div className="flex justify-between text-[10px] text-zinc-600 mb-1.5">
            <span>{b.label}</span>
            <span>
              <strong className={`font-semibold ${VALUE_COLOR[b.tone]}`}>{b.left}</strong>
              {" / "}
              <span className="text-zinc-500">{b.right}</span>
            </span>
          </div>
          <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${BAR_COLOR[b.tone]}`} style={{ width: `${b.pct}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
