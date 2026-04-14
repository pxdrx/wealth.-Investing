type Student = {
  initials: string;
  name: string;
  pnl: string;
  pnlTone: "green" | "red";
  wr: string;
  trades: number;
  status: "ok" | "warn" | "err";
  gradient: string;
};

const STUDENTS: Student[] = [
  { initials: "RC", name: "Rafael Coutinho", pnl: "+12.4%", pnlTone: "green", wr: "64%", trades: 47, status: "ok", gradient: "from-blue-500 to-blue-700" },
  { initials: "LP", name: "Lucas Pereira", pnl: "+4.3%", pnlTone: "green", wr: "58%", trades: 29, status: "ok", gradient: "from-emerald-500 to-emerald-700" },
  { initials: "MF", name: "Maria Ferraz", pnl: "-1.8%", pnlTone: "red", wr: "42%", trades: 18, status: "warn", gradient: "from-violet-500 to-violet-700" },
];

const BADGE: Record<Student["status"], string> = {
  ok: "bg-emerald-100 text-emerald-700",
  warn: "bg-amber-100 text-amber-700",
  err: "bg-red-100 text-red-700",
};
const BADGE_LABEL: Record<Student["status"], string> = {
  ok: "Ativo",
  warn: "Atenção",
  err: "Crítico",
};

export function MentorPanel() {
  return (
    <div className="h-full flex flex-col gap-1.5">
      <div className="text-[10px] uppercase tracking-wider text-zinc-400 mb-1">
        Mentor · seus alunos
      </div>
      {STUDENTS.map((s) => (
        <div
          key={s.name}
          className="flex items-center gap-2.5 rounded-xl border border-zinc-100 bg-white px-3 py-2.5"
        >
          <div
            className={`w-8 h-8 rounded-full bg-gradient-to-br ${s.gradient} text-white flex items-center justify-center text-[11px] font-semibold shrink-0`}
          >
            {s.initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold text-zinc-900 truncate">{s.name}</div>
            <div className="flex gap-2 mt-0.5 text-[9px] text-zinc-500">
              <span>
                PnL:{" "}
                <strong className={s.pnlTone === "green" ? "text-emerald-600" : "text-red-600"}>
                  {s.pnl}
                </strong>
              </span>
              <span>
                WR <strong className="text-zinc-900">{s.wr}</strong>
              </span>
              <span>{s.trades} trades</span>
            </div>
          </div>
          <span
            className={`text-[8px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wider ${BADGE[s.status]}`}
          >
            {BADGE_LABEL[s.status]}
          </span>
        </div>
      ))}
    </div>
  );
}
