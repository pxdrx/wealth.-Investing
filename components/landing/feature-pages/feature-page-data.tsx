import { ReactNode } from "react";
import {
  Upload,
  FileSpreadsheet,
  RefreshCw,
  Layers,
  BarChart3,
  Calendar,
  TrendingUp,
  Target,
  Pencil,
  Brain,
  Sparkles,
  BookOpen,
  Shield,
  AlertTriangle,
  Bell,
  Gauge,
} from "lucide-react";
import { MockupImportFlow } from "./mockups/MockupImportFlow";
import { MockupAnalytics } from "./mockups/MockupAnalytics";
import { MockupJournal } from "./mockups/MockupJournal";
import { MockupRisk } from "./mockups/MockupRisk";
import {
  MockupImportDetail,
  MockupAnalyticsDetail,
  MockupJournalDetail,
  MockupRiskDetail,
} from "./mockups/MockupDetails";
import {
  ChecklistImport,
  ChecklistAnalytics,
  ChecklistJournal,
  ChecklistRisk,
} from "./mockups/MockupChecklists";

export interface FeaturePageData {
  slug: string;
  tag: string;
  number: string;
  headline: string;
  heroDescription: string;
  ctaText: string;
  heroMockup: ReactNode;
  statValue: string;
  statLabel: string;
  benefitsHeadline: string;
  benefits: {
    icon: ReactNode;
    title: string;
    description: string;
  }[];
  howItWorksTitle: string;
  steps: {
    title: string;
    description: string;
  }[];
  mockupSectionTitle: string;
  mockupSectionDescription: string;
  detailMockup: ReactNode;
  checklistTitle: string;
  checklist: string[];
  checklistVisual: ReactNode;
  testimonialQuote: string;
  testimonialName: string;
  testimonialRole: string;
  testimonialInitials: string;
  finalCtaHeadline: string;
  finalCtaDescription: string;
}

function iconBox(Icon: typeof Upload) {
  return (
    <Icon
      className="h-5 w-5"
      style={{ color: "hsl(var(--landing-accent))" }}
    />
  );
}

export const FEATURE_PAGES: Record<string, FeaturePageData> = {
  registre: {
    slug: "registre",
    tag: "REGISTRE",
    number: "01",
    headline: "Registro Automático de Operações",
    heroDescription:
      "Conecte suas contas de corretora e importe centenas de operações em segundos. MT5, cTrader, CSV — tudo centralizado em um só lugar, sem planilhas manuais.",
    ctaText: "Comece a registrar grátis",
    heroMockup: <MockupImportFlow />,
    statValue: "< 30s",
    statLabel: "Importe centenas de operações em segundos",
    benefitsHeadline: "Por que centralizar suas operações",
    benefits: [
      {
        icon: iconBox(Upload),
        title: "Import Automático",
        description:
          "Importe relatórios de MT5, cTrader e CSV com um único upload. Drag & drop ou seleção de arquivo.",
      },
      {
        icon: iconBox(FileSpreadsheet),
        title: "Multi-formato",
        description:
          "Suporte a XLSX, HTML (MT5 Statement), CSV genérico e formatos de corretora específicos.",
      },
      {
        icon: iconBox(RefreshCw),
        title: "Deduplicação Inteligente",
        description:
          "O sistema detecta trades duplicados automaticamente. Importe sem medo de bagunçar seus dados.",
      },
      {
        icon: iconBox(Layers),
        title: "Multi-conta",
        description:
          "Gerencie contas pessoais, prop firms e crypto no mesmo painel. Visão unificada do seu capital.",
      },
    ],
    howItWorksTitle: "Três passos para centralizar tudo",
    steps: [
      {
        title: "Exporte o relatório",
        description:
          "Na sua corretora, gere o relatório de operações (Statement) em formato XLSX, HTML ou CSV.",
      },
      {
        title: "Faça o upload",
        description:
          "Arraste o arquivo para a plataforma ou selecione manualmente. O parser identifica o formato automaticamente.",
      },
      {
        title: "Pronto — analise",
        description:
          "Suas operações aparecem organizadas no journal e dashboard em segundos, com todas as métricas calculadas.",
      },
    ],
    mockupSectionTitle: "Veja o fluxo de importação",
    mockupSectionDescription:
      "Interface limpa e intuitiva que reconhece seu arquivo e importa automaticamente",
    detailMockup: <MockupImportDetail />,
    checklistTitle: "Tudo que você precisa para registrar",
    checklist: [
      "Import MT5 (XLSX e HTML Statement)",
      "Import cTrader (CSV)",
      "Upload por drag & drop",
      "Deduplicação automática de trades",
      "Suporte a múltiplas contas simultâneas",
      "Contas pessoais, prop firms e crypto",
      "Log de importação com contagem e status",
      "Histórico completo de todas operações",
    ],
    checklistVisual: <ChecklistImport />,
    testimonialQuote:
      "Eu gastava 2 horas por semana montando planilhas. Agora importo tudo em 30 segundos e já tenho as métricas prontas.",
    testimonialName: "LUCAS ANDRADE",
    testimonialRole: "Day Trader — 3 contas prop + pessoal",
    testimonialInitials: "LA",
    finalCtaHeadline: "Pare de perder tempo com planilhas",
    finalCtaDescription:
      "Centralize todas as suas operações em segundos. Comece gratuitamente e veja seus dados organizados imediatamente.",
  },

  analise: {
    slug: "analise",
    tag: "ANALISE",
    number: "02",
    headline: "Análise Profunda de Performance",
    heroDescription:
      "Mais de 20 métricas para entender exatamente onde você ganha, onde perde e por quê. Calendário heatmap, equity curve, profit factor, win rate e muito mais.",
    ctaText: "Analise seu trading",
    heroMockup: <MockupAnalytics />,
    statValue: "20+",
    statLabel: "Métricas para entender seu trading em profundidade",
    benefitsHeadline: "Transforme dados em direção clara",
    benefits: [
      {
        icon: iconBox(BarChart3),
        title: "Dashboard Completo",
        description:
          "P&L, win rate, profit factor, expectancy, R-múltiplo — todas as métricas essenciais em tempo real.",
      },
      {
        icon: iconBox(Calendar),
        title: "Calendário Heatmap",
        description:
          "Visualize seus resultados dia a dia. Identifique padrões sazonais, dias da semana e horários de melhor performance.",
      },
      {
        icon: iconBox(TrendingUp),
        title: "Equity Curve",
        description:
          "Acompanhe a evolução do seu capital ao longo do tempo. Identifique fases de drawdown e recuperação.",
      },
      {
        icon: iconBox(Target),
        title: "Análise por Setup",
        description:
          "Compare a performance real de cada setup. Descubra quais estratégias sustentam seu P&L.",
      },
    ],
    howItWorksTitle: "Como a análise funciona",
    steps: [
      {
        title: "Importe seus dados",
        description:
          "Conecte suas contas ou faça upload dos relatórios. As métricas são calculadas automaticamente.",
      },
      {
        title: "Explore o dashboard",
        description:
          "Filtre por período, conta, setup ou tag. Navegue pelo calendário e identifique padrões.",
      },
      {
        title: "Tome decisões com dados",
        description:
          "Use os insights para ajustar sua estratégia. Corte o que não funciona, dobre o que dá resultado.",
      },
    ],
    mockupSectionTitle: "Seu painel de controle operacional",
    mockupSectionDescription:
      "Todos os números que importam, organizados para decisão rápida",
    detailMockup: <MockupAnalyticsDetail />,
    checklistTitle: "Métricas que fazem diferença",
    checklist: [
      "P&L total, diário, semanal e mensal",
      "Win rate e profit factor",
      "Expectancy e R-múltiplo médio",
      "Calendário heatmap com P&L por dia",
      "Equity curve com drawdown overlay",
      "Filtros por conta, período e setup",
      "RR Médio (avg win / avg loss)",
      "Sequência de wins/losses (streaks)",
    ],
    checklistVisual: <ChecklistAnalytics />,
    testimonialQuote:
      "Descobri que 70% do meu lucro vinha de apenas 2 setups — e que eu estava devolvendo tudo nos outros 5. O dashboard me mostrou isso em 5 minutos.",
    testimonialName: "RAFAEL MENDES",
    testimonialRole: "Trader Discricionário — FTMO + Conta Pessoal",
    testimonialInitials: "RM",
    finalCtaHeadline: "Veja seus números de verdade",
    finalCtaDescription:
      "Pare de operar no escuro. Entenda seus padrões, identifique vazamentos e opere com dados reais.",
  },

  evolua: {
    slug: "evolua",
    tag: "EVOLUA",
    number: "03",
    headline: "Diário de Trading Inteligente",
    heroDescription:
      "Documente cada operação com contexto completo. O AI Coach analisa seus padrões e te ajuda a evoluir como trader com feedback personalizado.",
    ctaText: "Evolua seu trading",
    heroMockup: <MockupJournal />,
    statValue: "3.2x",
    statLabel:
      "Traders que revisam operações têm 3.2x mais profit factor",
    benefitsHeadline: "Journaling que transforma performance",
    benefits: [
      {
        icon: iconBox(Pencil),
        title: "Contexto Completo",
        description:
          "Registre setup, emoção, qualidade de execução e notas para cada trade. Revisão com clareza, não achismo.",
      },
      {
        icon: iconBox(Brain),
        title: "AI Coach",
        description:
          "Inteligência artificial que analisa seus dados e oferece feedback honesto e personalizado sobre seu operacional.",
      },
      {
        icon: iconBox(Sparkles),
        title: "Reconhecimento de Padrões",
        description:
          "Identifique vieses emocionais, horários problemáticos e padrões de overtrading antes que custem capital.",
      },
      {
        icon: iconBox(BookOpen),
        title: "Observações Diárias",
        description:
          "Calendário com notas do dia. Blue dots indicam dias com anotações para fácil navegação e revisão.",
      },
    ],
    howItWorksTitle: "Como o journal inteligente funciona",
    steps: [
      {
        title: "Documente o trade",
        description:
          "Após cada operação, registre setup, emoção, execução e suas observações. Auto-save garante que nada se perde.",
      },
      {
        title: "Revise com o AI Coach",
        description:
          "Pergunte ao Coach sobre seus padrões. Ele cruza suas métricas pessoais com contexto de mercado para orientar.",
      },
      {
        title: "Evolua com consistência",
        description:
          "Use as revisões semanais para ajustar estratégias. Traders que documentam evoluem mais rápido.",
      },
    ],
    mockupSectionTitle: "Journal + AI Coach integrados",
    mockupSectionDescription:
      "Documente suas operações e receba feedback inteligente do seu analista pessoal",
    detailMockup: <MockupJournalDetail />,
    checklistTitle: "Ferramentas para evoluir",
    checklist: [
      "Registro de trade com contexto completo",
      "Tags customizáveis (setup, ativo, sessão, emoção)",
      "Observações diárias no calendário",
      "AI Coach com análise personalizada",
      "Auto-save de todas as notas",
      "Rating de qualidade de execução",
      "Histórico completo de revisões",
      "Blue dots para navegação rápida",
    ],
    checklistVisual: <ChecklistJournal />,
    testimonialQuote:
      "O AI Coach me mostrou que eu opero pior às sextas-feiras. Algo que eu nunca teria percebido sozinho olhando planilha.",
    testimonialName: "CARLOS SILVA",
    testimonialRole: "Swing Trader — The5ers 100k",
    testimonialInitials: "CS",
    finalCtaHeadline: "Sua próxima operação pode ser melhor",
    finalCtaDescription:
      "Comece a documentar e revisar suas operações com inteligência. O journal transforma experiência em vantagem.",
  },

  proteja: {
    slug: "proteja",
    tag: "PROTEJA",
    number: "04",
    headline: "Gestão de Risco e Proteção de Capital",
    heroDescription:
      "Monitore drawdown em tempo real, acompanhe regras de prop firms e receba alertas antes de quebrar seus próprios limites. Para quem leva gestão de risco a sério.",
    ctaText: "Proteja seu capital",
    heroMockup: <MockupRisk />,
    statValue: "24/7",
    statLabel: "Monitore limites de drawdown em tempo real",
    benefitsHeadline: "Proteção ativa do seu capital",
    benefits: [
      {
        icon: iconBox(Shield),
        title: "Drawdown Tracking",
        description:
          "Acompanhe drawdown máximo diário e total. Barra visual mostra exatamente onde você está em relação aos limites.",
      },
      {
        icon: iconBox(AlertTriangle),
        title: "Alertas Inteligentes",
        description:
          "Receba notificações quando se aproximar de limites de drawdown, metas diárias ou número máximo de trades.",
      },
      {
        icon: iconBox(Bell),
        title: "Prop Firm Rules",
        description:
          "Regras de cada mesa proprietária configuradas. Acompanhe fases de avaliação e limites específicos.",
      },
      {
        icon: iconBox(Gauge),
        title: "Relatórios de Risco",
        description:
          "Exposição por ativo, risco por operação, consistência da gestão de capital e métricas de disciplina.",
      },
    ],
    howItWorksTitle: "Como a gestão de risco funciona",
    steps: [
      {
        title: "Configure seus limites",
        description:
          "Defina drawdown máximo, perda diária, metas e regras da sua prop firm. A plataforma monitora tudo.",
      },
      {
        title: "Opere com confiança",
        description:
          "Veja sua barra de drawdown em tempo real. Saiba exatamente quanto espaço você tem antes de atingir limites.",
      },
      {
        title: "Receba alertas",
        description:
          "Quando se aproximar dos limites, alertas te avisam antes que seja tarde. Proteja seu capital e suas contas.",
      },
    ],
    mockupSectionTitle: "Controle total sobre seu risco",
    mockupSectionDescription:
      "Drawdown bars, alertas e métricas de risco visíveis em tempo real",
    detailMockup: <MockupRiskDetail />,
    checklistTitle: "Proteção completa incluída",
    checklist: [
      "Barra de drawdown diário e total",
      "Alertas configuráveis por limite",
      "Regras de prop firms pré-configuradas",
      "Controle de fases (Challenge, Verificação, Funded)",
      "Limite de trades por dia",
      "Meta diária de resultado",
      "Relatório de consistência",
      "Integração com alertas do TradingView",
    ],
    checklistVisual: <ChecklistRisk />,
    testimonialQuote:
      "Perdi 2 contas FTMO antes por falta de controle. Desde que uso a wealth.Investing, nunca mais ultrapassei um limite. A barra de drawdown é minha melhor ferramenta.",
    testimonialName: "PEDRO COSTA",
    testimonialRole: "Prop Trader — FTMO + The5ers",
    testimonialInitials: "PC",
    finalCtaHeadline: "Nunca mais perca uma conta por descuido",
    finalCtaDescription:
      "Monitore seus limites em tempo real e opere com a tranquilidade de saber que está protegido.",
  },
};
