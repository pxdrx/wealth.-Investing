export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  bodyHtml: string;
  readTime: string;
  publishedAt: string;
  gradient: string;
};

const ptPosts: BlogPost[] = [
  {
    slug: "por-que-voce-acha-que-perde-mais-nas-quintas",
    title: "Por que você acha que perde mais nas quintas",
    excerpt:
      "Intuição é um péssimo jornal. A primeira coisa que muda quando você começa a medir é o tamanho da história que você conta pra si mesmo.",
    bodyHtml: `
      <p>Todo trader tem uma versão mental do próprio operacional. Ela quase nunca bate com os dados.</p>
      <p>Quintas-feiras são o exemplo clássico. Você perde cinco trades seguidos num dia e a percepção gruda: "quintas são ruins pra mim". Meses depois, esse rótulo ainda está ali, guiando decisões — até que alguém puxa o histórico e mostra que, na média dos últimos 90 dias, quintas foram ligeiramente acima da média.</p>
      <p>Um jornal que se preenche sozinho — importado do MT5, agrupado por dia, por setup, por sessão — colapsa esse tipo de narrativa em cinco minutos. E abre espaço pra você descobrir padrões reais: os que realmente destroem ou sustentam sua curva.</p>
      <p>Na wealth, a função mais usada pelos traders que viram consistência não é o dashboard principal. É o filtro por dia da semana combinado com o tag por erro. É ali que a história se ajusta com a evidência.</p>
    `,
    readTime: "4 min",
    publishedAt: "2026-04-18",
    gradient: "from-amber-500/20 to-red-500/10",
  },
  {
    slug: "o-journal-nao-e-sobre-trades",
    title: "O journal não é sobre trades. É sobre você.",
    excerpt:
      "Planilha de trade lista o que aconteceu no gráfico. O journal que realmente funciona registra o que aconteceu na sua cabeça.",
    bodyHtml: `
      <p>Todo mundo começa registrando entrada, saída, PnL. É útil por um tempo — até virar ruído. Três meses depois você tem 500 linhas e nenhuma ideia do que fazer com elas.</p>
      <p>O que sustenta consistência no longo prazo é outra coisa: o contexto em volta de cada ordem. Em que estado você estava? Quantas horas dormiu? Você tinha plano escrito antes da entrada? Que viés você carregou pro gráfico — herdado do trade anterior, da notícia, da birra?</p>
      <p>A wealth puxa o trade do MT5 automaticamente. O que pedimos pra você é preencher <em>uma</em> tag. Um clique. "Pressa", "revenge", "fomo", "fora do plano", "sono". Em 30 dias você tem um retrato claro do que realmente te segura.</p>
      <p>Não é sobre ser minucioso. É sobre ser honesto com o padrão certo.</p>
    `,
    readTime: "5 min",
    publishedAt: "2026-04-15",
    gradient: "from-emerald-500/20 to-blue-500/10",
  },
  {
    slug: "prop-firm-nao-e-loteria",
    title: "Prop firm não é loteria. É gestão de regra.",
    excerpt:
      "Quem quebra challenge raramente erra o setup. Quebra porque mediu o drawdown só depois de bater nele.",
    bodyHtml: `
      <p>O padrão é sempre o mesmo. Trader recebe uma 100k, entra confiante, segue seu plano por duas semanas. Aí vem um dia ruim, um stop mais largo do que o habitual, um "vou recuperar" — e num único dia o drawdown diário explode a 5%.</p>
      <p>A prop firm não manda email de aviso. Ela só fecha a conta.</p>
      <p>O que a maioria dos traders não têm é um painel ativo mostrando, <em>antes de cada entrada</em>: "você já consumiu 2,1% dos 5% diários. Um trade a mais desse tamanho fecha seu challenge". Esse painel existe. Não é luxo, é sobrevivência.</p>
      <p>A wealth tem um painel por prop firm — The5ers, FTMO — com regra em tempo real, alerta antes do limite, histórico de margem queimada. Zero surpresa no dia 29 do ciclo.</p>
    `,
    readTime: "4 min",
    publishedAt: "2026-04-12",
    gradient: "from-violet-500/20 to-amber-500/10",
  },
];

const enPosts: BlogPost[] = [
  {
    slug: "why-you-think-you-lose-more-on-thursdays",
    title: "Why you think you lose more on Thursdays",
    excerpt:
      "Intuition is a terrible journal. The first thing that changes when you start measuring is the size of the story you tell yourself.",
    bodyHtml: `
      <p>Every trader has a mental version of their own track record. It almost never matches the data.</p>
      <p>Thursdays are the classic case. You lose five in a row one afternoon and the label sticks: "Thursdays are bad for me." Months later, that label is still steering decisions — until someone pulls the real history and shows Thursdays were actually slightly above average.</p>
      <p>A journal that fills itself — imported from MT5, grouped by day, by setup, by session — collapses that kind of narrative in five minutes. And it makes room for the patterns that actually matter: the ones genuinely breaking or sustaining your equity.</p>
      <p>On wealth, the tool most used by traders who reach consistency isn't the main dashboard. It's the day-of-week filter combined with the error tag. That's where the story starts to fit the evidence.</p>
    `,
    readTime: "4 min",
    publishedAt: "2026-04-18",
    gradient: "from-amber-500/20 to-red-500/10",
  },
  {
    slug: "the-journal-is-not-about-trades",
    title: "The journal isn't about trades. It's about you.",
    excerpt:
      "A trade log tells you what happened on the chart. A journal that actually works records what happened in your head.",
    bodyHtml: `
      <p>Everyone starts by logging entry, exit, PnL. It's useful for a while — until it becomes noise. Three months in you have 500 rows and no idea what to do with them.</p>
      <p>What sustains long-term consistency is something else entirely: the context around each order. What state were you in? How many hours of sleep? Did you have a written plan before the entry? What bias did you drag into the chart — from the previous trade, the news, a grudge?</p>
      <p>wealth imports the trade from MT5 automatically. What we ask you to fill is a single tag. One click. "Rushed", "revenge", "fomo", "off-plan", "tired". In 30 days you have a clear picture of what actually holds you back.</p>
      <p>It's not about being meticulous. It's about being honest with the right pattern.</p>
    `,
    readTime: "5 min",
    publishedAt: "2026-04-15",
    gradient: "from-emerald-500/20 to-blue-500/10",
  },
  {
    slug: "prop-firms-are-not-a-lottery",
    title: "Prop firms are not a lottery. They're rule management.",
    excerpt:
      "Traders rarely blow challenges on a bad setup. They blow them because they only measured the drawdown after hitting it.",
    bodyHtml: `
      <p>The pattern is always the same. Trader gets a 100k account, goes in confident, follows the plan for two weeks. Then a bad day lands, a wider stop than usual, an "I'll make it back" — and in a single session daily drawdown explodes past 5%.</p>
      <p>The prop firm doesn't send a warning email. It just closes the account.</p>
      <p>What most traders don't have is a live panel showing, <em>before every entry</em>: "you've used 2.1% of your 5% daily. One more trade that size closes your challenge." That panel exists. It's not luxury — it's survival.</p>
      <p>wealth has a panel per prop firm — The5ers, FTMO — with live rule tracking, alerts before the limit, and a history of burned margin. Zero surprise on day 29 of the cycle.</p>
    `,
    readTime: "4 min",
    publishedAt: "2026-04-12",
    gradient: "from-violet-500/20 to-amber-500/10",
  },
];

export const MOCK_POSTS: Record<"pt" | "en", BlogPost[]> = {
  pt: ptPosts,
  en: enPosts,
};

export function getPostsForLocale(locale: string): BlogPost[] {
  return MOCK_POSTS[locale === "en" ? "en" : "pt"];
}

export function getPostBySlug(locale: string, slug: string): BlogPost | null {
  return getPostsForLocale(locale).find((p) => p.slug === slug) ?? null;
}
