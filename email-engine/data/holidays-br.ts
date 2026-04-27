// BR national bank holidays — daily briefing skips on these dates.
// Update annually. Last reviewed: 2026-04 (covering 2026 + early 2027).

const HOLIDAYS_BR_2026: ReadonlyArray<string> = [
  "2026-01-01", // Confraternização Universal
  "2026-02-16", // Carnaval (segunda)
  "2026-02-17", // Carnaval (terça)
  "2026-04-03", // Sexta-feira Santa
  "2026-04-21", // Tiradentes
  "2026-05-01", // Dia do Trabalho
  "2026-06-04", // Corpus Christi
  "2026-09-07", // Independência
  "2026-10-12", // Nossa Senhora Aparecida
  "2026-11-02", // Finados
  "2026-11-15", // Proclamação da República
  "2026-12-25", // Natal
];

const HOLIDAYS_BR_2027: ReadonlyArray<string> = [
  "2027-01-01",
  "2027-02-08",
  "2027-02-09",
  "2027-03-26",
  "2027-04-21",
  "2027-05-01",
  "2027-05-27",
  "2027-09-07",
  "2027-10-12",
  "2027-11-02",
  "2027-11-15",
  "2027-12-25",
];

const HOLIDAYS = new Set<string>([...HOLIDAYS_BR_2026, ...HOLIDAYS_BR_2027]);

export function isBrHoliday(dateYmd: string): boolean {
  return HOLIDAYS.has(dateYmd);
}
