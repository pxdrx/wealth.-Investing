/* ─────────────────────────────────────────────────────────────
   lib/landing-data.ts  –  All copy & mock data for the landing page
   ──────────────────────────────────────────────────────────── */

/* ── Navigation ─────────────────────────────────────────────── */
export const NAV_LINKS = [
  { label: "Plataforma", href: "#plataforma" },
  { label: "Recursos", href: "#registre" },
  { label: "Para Mesas", href: "#mesas" },
  { label: "Preços", href: "#precos" },
] as const;

/** Nav links shown when the user is authenticated */
export const NAV_LINKS_AUTH = [
  { label: "Dashboard", href: "/app" },
  { label: "Journal", href: "/app/journal" },
  { label: "AI Coach", href: "/app/ai-coach" },
  { label: "Calendário", href: "/app/journal?tab=calendar" },
] as const;

/* ── Announcement bar ───────────────────────────────────────── */
export const ANNOUNCEMENT = {
  text: "CONSISTÊNCIA SE CONSTRÓI COM DADOS — COMECE AGORA",
  href: "/login",
  platforms: ["MT4", "MT5", "cTrader", "Binance", "B3", "TradingView"],
} as const;

/* ── Hero ────────────────────────────────────────────────────── */
export const HERO = {
  headline: "Tenha clareza total sobre cada operação que você executa",
  subheadline:
    "A wealth.Investing centraliza suas operações de múltiplas contas, analisa seus padrões e transforma dados brutos em insights acionáveis para você operar com consistência e disciplina real.",
  ctaPrimary: "Comece grátis",
} as const;

/* ── Trust bar ───────────────────────────────────────────────── */
export const TRUST_PLATFORMS = [
  "MetaTrader 4",
  "MetaTrader 5",
  "cTrader",
  "TradingView",
  "Binance",
  "B3",
  "NinjaTrader",
  "Thinkorswim",
] as const;

/* ── How it works (stats) ────────────────────────────────────── */
export const STATS_SECTION = {
  label: "COMO FUNCIONA",
  headline:
    "A wealth.Investing transforma suas operações em dashboards, relatórios e insights que guiam sua evolução como trader.",
  stats: [
    {
      value: "3.2x",
      numericValue: 3.2,
      suffix: "x",
      label: "Melhoria no profit factor",
      description:
        "Traders que revisam operações com dados têm em média 3.2x mais profit factor em 6 meses.",
    },
    {
      value: "47%",
      numericValue: 47,
      suffix: "%",
      label: "Redução de trades impulsivos",
      description:
        "Identificar padrões de impulsividade reduz overtrading e entradas fora do plano significativamente.",
    },
    {
      value: "12h",
      numericValue: 12,
      suffix: "h",
      label: "Economizadas por semana",
      description:
        "Pare de montar planilhas manuais. Centralize, analise e revise suas operações em uma fração do tempo.",
    },
  ],
} as const;

/* ── Feature sections ────────────────────────────────────────── */
export interface FeatureItem {
  icon: string;
  title: string;
  badge?: string;
  description: string;
}

export interface FeatureData {
  tag: string;
  number: string;
  headline: string;
  description: string;
  subLabel: string;
  features: FeatureItem[];
  link: { text: string; href: string };
}

export const FEATURES: FeatureData[] = [
  {
    tag: "REGISTRE",
    number: "01",
    headline: "Centralize todas as suas operações automaticamente",
    description:
      "Conecte suas contas de corretora, importe trades via CSV ou deixe a sincronização automática trabalhar por você. Múltiplas contas, múltiplas corretoras, uma visão unificada.",
    subLabel: "CONECTE SUAS CONTAS",
    features: [
      {
        icon: "link",
        title: "Sync Automático",
        description:
          "Sincronize operações diretamente da sua corretora. MT4, MT5, cTrader e mais.",
      },
      {
        icon: "file-text",
        title: "Import CSV/Excel",
        description:
          "Importe históricos completos de qualquer plataforma em segundos.",
      },
      {
        icon: "landmark",
        title: "Multi-conta",
        description:
          "Gerencie contas pessoais e de mesa proprietária no mesmo painel.",
      },
    ],
    link: { text: "Saiba mais sobre integrações", href: "#registre" },
  },
  {
    tag: "ANALISE",
    number: "02",
    headline: "Descubra onde você ganha, onde perde e por quê",
    description:
      "Transforme dados brutos em direção clara. Identifique setups vencedores, horários de melhor performance, vieses emocionais e vazamentos que estão custando seu capital.",
    subLabel: "EXPLORE ANALYTICS",
    features: [
      {
        icon: "bar-chart-3",
        title: "Dashboard de Performance",
        description:
          "Visualize P&L, win rate, profit factor, R-múltiplo, expectancy e mais — filtrado por período, conta, setup ou tag.",
      },
      {
        icon: "flame",
        title: "Heatmap de Calendário",
        description:
          "Veja a distribuição dos seus resultados dia a dia. Identifique padrões sazonais e dias problemáticos.",
      },
      {
        icon: "trending-up",
        title: "Análise por Setup",
        description:
          "Compare a performance real de cada setup. Saiba exatamente qual estratégia sustenta seu P&L.",
      },
    ],
    link: { text: "Saiba mais sobre analytics", href: "#analise" },
  },
  {
    tag: "EVOLUA",
    number: "03",
    headline: "Transforme revisão em vantagem competitiva",
    description:
      "Use o journal inteligente para documentar suas operações com contexto: screenshots, tags de setup, notas emocionais, rating de execução. Revise com clareza, não com achismo.",
    subLabel: "EXPLORE JOURNALING",
    features: [
      {
        icon: "pencil",
        title: "Journal Inteligente",
        description:
          "Registre cada trade com contexto completo: setup, emoção, qualidade de execução, notas e screenshots.",
      },
      {
        icon: "tag",
        title: "Tags Profissionais",
        description:
          "Crie e aplique tags customizadas: setup, ativo, sessão de mercado, estado emocional, tipo de entrada.",
      },
      {
        icon: "clipboard-list",
        title: "Playbook de Setups",
        description:
          "Documente seus setups com regras claras e compare a execução real vs. o plano.",
      },
    ],
    link: { text: "Saiba mais sobre journaling", href: "#evolua" },
  },
  {
    tag: "PROTEJA",
    number: "04",
    headline: "Gestão de risco que opera junto com você",
    description:
      "Defina limites diários de perda, metas de profit, regras de drawdown e receba alertas antes de quebrar suas próprias regras. Para quem leva a sério a gestão de risco.",
    subLabel: "EXPLORE GESTÃO DE RISCO",
    features: [
      {
        icon: "shield",
        title: "Alertas Inteligentes",
        description:
          "Receba notificações quando atingir limites de drawdown, metas diárias ou número máximo de trades.",
      },
      {
        icon: "target",
        title: "Metas e Regras",
        description:
          "Configure limites diários, semanais e mensais. A plataforma te avisa antes de você sair do plano.",
      },
      {
        icon: "bar-chart-2",
        title: "Relatórios de Risco",
        description:
          "Acompanhe drawdown máximo, risco por operação, exposição e consistência da sua gestão de capital.",
      },
    ],
    link: { text: "Saiba mais sobre gestão de risco", href: "#proteja" },
  },
];

/* ── AI Assistant section ────────────────────────────────────── */
export const AI_SECTION = {
  label: "AI COACH",
  number: "05",
  headline: "Um analista de mercado que conhece cada trade seu",
  description:
    "Não é um chatbot genérico. O AI Coach cruza suas estatísticas pessoais com contexto macroeconômico e o sentimento dos traders lucrativos da plataforma para te orientar com dados reais.",
  features: [
    {
      icon: "message-circle",
      title: "Análise com 4 fontes de dados",
      description:
        "Suas métricas pessoais, headlines macro, sentimento dos traders lucrativos da plataforma e padrões históricos — tudo cruzado em cada resposta.",
    },
    {
      icon: "brain",
      title: "Discorda quando precisa",
      description:
        "Se seus dados mostram que você perde no horário que está operando, o Coach vai te dizer. Orientação honesta, sempre fundamentada em dados.",
    },
    {
      icon: "compass",
      title: "Inteligência coletiva",
      description:
        "Saiba o que os traders lucrativos da plataforma estão operando. Sentimento agregado e anônimo que complementa sua análise.",
    },
  ],
} as const;

/* ── Macro Intelligence section ──────────────────────────────── */
export const MACRO_SECTION = {
  label: "INTELIGÊNCIA MACRO",
  headline: "Contexto macroeconômico integrado ao seu operacional",
  description:
    "Traders consistentes não operam no vácuo. A wealth.Investing traz o contexto macro que você precisa — calendário econômico, headlines geopolíticas e eventos de impacto — diretamente na plataforma.",
  modules: [
    {
      title: "Calendário Econômico",
      description: "Eventos do dia com classificação de impacto, horário e consenso de mercado.",
    },
    {
      title: "Headlines & Geopolítica",
      description: "Notícias filtradas por relevância para traders: guerras, sanções, decisões de bancos centrais, dados macro.",
    },
    {
      title: "Contexto pré-operacional",
      description: "Antes de abrir posição, veja o cenário macro do dia. Evite operar contra eventos de alto impacto sem saber.",
    },
  ],
  calendarEvents: [
    { time: "09:30", event: "NFP — Non-Farm Payrolls", impact: "high" as const, country: "EUA" },
    { time: "11:00", event: "ISM Manufacturing PMI", impact: "medium" as const, country: "EUA" },
    { time: "14:00", event: "Decisão de juros — COPOM", impact: "high" as const, country: "BRA" },
    { time: "15:30", event: "Estoques de petróleo — EIA", impact: "low" as const, country: "EUA" },
  ],
  headlines: [
    "Fed sinaliza manutenção de juros em reunião de março",
    "Tensões no Mar do Sul da China elevam volatilidade em commodities",
    "BCE mantém postura hawkish: inflação ainda preocupa",
  ],
} as const;

/* ── Testimonial ─────────────────────────────────────────────── */
export const TESTIMONIAL = {
  quote:
    "Eu achava que conhecia meu operacional até começar a ver os dados reais. Em 3 meses usando a wealth.Investing, identifiquei que 70% do meu lucro vinha de apenas 2 setups — e que eu estava devolvendo tudo nos outros 5. Isso mudou completamente minha abordagem.",
  name: "RAFAEL MENDES",
  role: "Trader Discricionário — Conta Pessoal + Mesa FTMO",
  initials: "RM",
} as const;

/* ── CTA final ───────────────────────────────────────────────── */
export const CTA_FINAL = {
  headline: "Transforme dados em consistência operacional",
  ctaPrimary: "Comece grátis",
} as const;

/* ── Enterprise / Trust ──────────────────────────────────────── */
export const ENTERPRISE = {
  security: {
    title: "Segurança dos seus dados em primeiro lugar",
    description:
      "A wealth.Investing protege seus dados operacionais com criptografia de ponta a ponta, infraestrutura cloud segura e controle total de acesso.",
    badges: [
      { icon: "lock", label: "Criptografia AES-256" },
      { icon: "cloud", label: "Cloud Segura" },
      { icon: "smartphone", label: "2FA" },
      { icon: "shield-check", label: "LGPD" },
    ],
  },
  cards: [
    {
      title: "Multi-conta sem complicação",
      description:
        "Gerencie contas pessoais, de mesa proprietária, challenges e contas demo — tudo no mesmo lugar. Compare performance entre contas e tenha visão consolidada.",
    },
    {
      title: "Feito para mesas proprietárias",
      description:
        "Acompanhe regras de drawdown da mesa, fases de avaliação, limites diários e progresso em tempo real. Nunca mais perca uma conta por falta de controle.",
    },
  ],
} as const;

/* ── Footer ──────────────────────────────────────────────────── */

/** Product links: when logged in, point to app pages; when logged out, scroll to pricing */
export interface FooterProductLink {
  label: string;
  hrefAuth: string;
  hrefGuest: string;
}

export const FOOTER_PRODUCT_LINKS: FooterProductLink[] = [
  { label: "Dashboard", hrefAuth: "/app", hrefGuest: "#precos" },
  { label: "Journal", hrefAuth: "/app/journal", hrefGuest: "#precos" },
  { label: "Analytics", hrefAuth: "/app", hrefGuest: "#precos" },
  { label: "Calendário", hrefAuth: "/app/journal?tab=calendar", hrefGuest: "#precos" },
  { label: "Gestão de Risco", hrefAuth: "/app/alerts", hrefGuest: "#precos" },
  { label: "Multi-conta", hrefAuth: "/app/manage-accounts", hrefGuest: "#precos" },
  { label: "Preços", hrefAuth: "/app/pricing", hrefGuest: "#precos" },
];

export const FOOTER_RESOURCE_LINKS = [
  { label: "Blog", href: "/blog" },
  { label: "Changelog", href: "/changelog" },
  { label: "Academy", href: "/academy" },
  { label: "Nosso Manifesto", href: "/manifesto" },
] as const;

export const FOOTER_CONTACT_LINKS = [
  { label: "Comunidade", href: "https://discord.gg/smlab", external: true },
  { label: "Fale conosco", href: "mailto:contato@wealth.investing", external: true },
] as const;

export const FOOTER_SOCIAL_LINKS = [
  { label: "Instagram", href: "em-breve" },
  { label: "Discord", href: "https://discord.gg/smlab" },
] as const;

export const FOOTER_MANIFESTO = {
  title: "O trader consistente: disciplina, dados e processo",
  subtitle: "Nosso manifesto",
  href: "/manifesto",
} as const;

export const FOOTER_LEGAL = [
  { label: "Cookies", href: "#" },
  { label: "Privacidade", href: "#" },
  { label: "Termos de uso", href: "#" },
] as const;
