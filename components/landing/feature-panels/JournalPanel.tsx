export function JournalPanel() {
  return (
    <div className="h-full flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        <Kpi label="Net PnL" value="+$4.280" tone="green" />
        <Kpi label="Win rate" value="62%" />
        <Kpi label="Trades" value="147" />
      </div>
      <div className="flex-1 rounded-lg bg-white border border-zinc-100 p-3">
        <div className="text-[9px] uppercase tracking-wider text-zinc-400 mb-1.5">
          Equity curve · últimos 30 dias
        </div>
        <svg viewBox="0 0 400 130" preserveAspectRatio="none" className="w-full h-[140px]">
          <defs>
            <linearGradient id="eq-j" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#16a34a" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M 0 100 L 30 92 L 60 96 L 90 78 L 120 84 L 150 65 L 180 70 L 210 50 L 240 55 L 270 38 L 300 42 L 330 26 L 360 30 L 400 18 L 400 130 L 0 130 Z"
            fill="url(#eq-j)"
          />
          <path
            d="M 0 100 L 30 92 L 60 96 L 90 78 L 120 84 L 150 65 L 180 70 L 210 50 L 240 55 L 270 38 L 300 42 L 330 26 L 360 30 L 400 18"
            stroke="#16a34a"
            strokeWidth="1.8"
            fill="none"
          />
        </svg>
      </div>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "green" | "red" }) {
  const color = tone === "green" ? "text-emerald-600" : tone === "red" ? "text-red-600" : "text-zinc-900";
  return (
    <div className="rounded-lg bg-white border border-zinc-100 p-2.5">
      <div className="text-[8px] uppercase tracking-wider text-zinc-400">{label}</div>
      <div className={`text-[15px] font-semibold mt-0.5 ${color}`}>{value}</div>
    </div>
  );
}
