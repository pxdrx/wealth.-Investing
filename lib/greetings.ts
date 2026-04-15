// Deterministic per-day greeting: picks a phrase from a pool based on time-of-day
// and a stable seed (date + userId) so the same user sees one greeting per day.

type Period = "dawn" | "morning" | "afternoon" | "evening";

const GREETINGS: Record<Period, string[]> = {
  dawn: [
    "Boa madrugada",
    "Ainda de pé",
    "Sessão asiática rolando",
    "Madrugadeiro de plantão",
    "Os mercados não dormem",
    "Horário nobre do yen",
    "Bem-vindo à vigília",
    "Quem madruga, opera",
  ],
  morning: [
    "Bom dia",
    "Pregão abrindo",
    "Café na mão",
    "Hora de ligar os gráficos",
    "Mercado acordando",
    "Bom dia, trader",
    "Pronto pra abertura",
    "Dia novo, setup novo",
  ],
  afternoon: [
    "Boa tarde",
    "Sessão rodando",
    "Meio da jornada",
    "Tarde produtiva",
    "Mercado em ritmo",
    "Boa tarde, operador",
    "Sessão americana chegando",
    "Hora do almoço dos gringos",
  ],
  evening: [
    "Boa noite",
    "Pregão fechado",
    "Hora da análise",
    "Review do dia",
    "Fechando os livros",
    "Noite de estudo",
    "Balanço do dia",
    "Boa noite, trader",
  ],
};

const SUBTITLES: Record<Period, string[]> = {
  dawn: [
    "Mercado descansando — bom momento para revisar a estratégia.",
    "Silêncio na mesa, tempo pra planejar o dia.",
    "Poucos players online — aproveita o sossego.",
    "Madrugada é lugar de preparação, não de entrada ansiosa.",
    "Enquanto o mundo dorme, você estuda.",
  ],
  morning: [
    "Aqui está o resumo das suas contas para abrir o dia.",
    "Dados quentes, mercado acordando. Vamos ver o cenário.",
    "Panorama completo antes da primeira operação.",
    "Prepara a xícara — seu briefing está pronto.",
    "Abertura é decisão: aqui vai seu mapa.",
  ],
  afternoon: [
    "Sessão em andamento — aqui estão seus dados.",
    "No meio do jogo. Como estão os números?",
    "Hora de ajustar o plano se precisar.",
    "Acompanhe o que importa e ignore o ruído.",
    "Mercado ativo, disciplina ativa.",
  ],
  evening: [
    "Fechamento do dia. Hora de analisar os resultados.",
    "Dia encerrado — vale a pena olhar pra trás.",
    "O melhor trade é o que você aprende depois.",
    "Reveja, anote, amanhã começa diferente.",
    "Pregão fechado, journal aberto.",
  ],
};

function getPeriod(date: Date): Period {
  const h = date.getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 18) return "afternoon";
  if (h >= 18 && h < 24) return "evening";
  return "dawn";
}

// Stable hash from string → number in [0, pool.length)
function hashPick(seed: string, poolSize: number): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % poolSize;
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/** Greeting without name. Append ", {nome}" in the caller if desired. */
export function getGreeting(date: Date, seed?: string | null): string {
  const period = getPeriod(date);
  const pool = GREETINGS[period];
  const key = `${dateKey(date)}|${seed ?? "anon"}|greeting`;
  return pool[hashPick(key, pool.length)] ?? pool[0];
}

export function getDashboardSubtitle(date: Date, seed?: string | null): string {
  const period = getPeriod(date);
  const pool = SUBTITLES[period];
  const key = `${dateKey(date)}|${seed ?? "anon"}|subtitle`;
  return pool[hashPick(key, pool.length)] ?? pool[0];
}
