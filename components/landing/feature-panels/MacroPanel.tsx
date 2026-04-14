import { FlagIcon } from "./FlagIcon";

type Event = {
  country: "US" | "EU" | "UK";
  region: string;
  name: string;
  time: string;
  impact: "high" | "medium" | "low";
};

const EVENTS: Event[] = [
  { country: "US", region: "Estados Unidos", name: "CPI YoY", time: "14:30", impact: "high" },
  { country: "EU", region: "Zona do Euro", name: "ECB Rate Decision", time: "15:45", impact: "high" },
  { country: "US", region: "Estados Unidos", name: "PPI MoM", time: "17:00", impact: "medium" },
  { country: "US", region: "Estados Unidos", name: "NFP (Non-Farm Payrolls)", time: "19:30", impact: "high" },
  { country: "UK", region: "Reino Unido", name: "BOE Rate Decision", time: "20:00", impact: "medium" },
];

const IMPACT_COLOR: Record<Event["impact"], string> = {
  high: "bg-red-600",
  medium: "bg-amber-400",
  low: "bg-emerald-500",
};

export function MacroPanel() {
  return (
    <div className="h-full flex flex-col gap-1.5">
      <div className="text-[10px] uppercase tracking-wider text-zinc-400 mb-1">
        Calendário macroeconômico · hoje
      </div>
      {EVENTS.map((e) => (
        <div
          key={e.name}
          className="flex items-center justify-between rounded-md border border-zinc-100 bg-white px-3 py-2 text-[11px]"
        >
          <div className="flex items-center gap-2 min-w-0">
            <FlagIcon country={e.country} />
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-zinc-900 truncate">{e.name}</span>
              <span className="text-[9px] text-zinc-500">{e.region}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-semibold text-zinc-900">{e.time}</span>
            <span className={`w-2 h-2 rounded-full ${IMPACT_COLOR[e.impact]}`} aria-label={`impacto ${e.impact}`} />
          </div>
        </div>
      ))}
    </div>
  );
}
