# wealth.Investing — CLAUDE.md

## Stack
- Next.js 14 (App Router)
- TypeScript (strict)
- Tailwind CSS + shadcn/ui
- Supabase (auth + database)
- Framer Motion (animações)
- Recharts (gráficos)
- lucide-react (ícones)

## Estrutura de pastas
app/                    → rotas Next.js App Router
  page.tsx              → landing (spiral animation, pública)
  login/page.tsx        → autenticação (signin/signup/magic link)
  onboarding/page.tsx   → coleta display_name (Google/magic link users)
  app/                  → área autenticada (protegida pelo AuthGate)
    page.tsx            → dashboard
    journal/page.tsx    → journal de trades
    news/page.tsx       → notícias
    alerts/page.tsx     → alertas
    wallet/page.tsx     → wallet (em desenvolvimento)
    account/page.tsx    → configurações do usuário
  api/                  → routes de API
    news/               → proxy de notícias
    journal/import-mt5/ → parser de relatórios MT5

components/
  ui/                   → shadcn components base (button, card, input, etc.)
  layout/               → AppShell, AppHeader
  brand/                → BrandMark
  auth/                 → AuthGate
  context/              → ActiveAccountContext, ThemeProvider
  journal/              → JournalKpiCards, JournalEquityChart, JournalTradesTable, PnlCalendar, TradeDetailModal
  account/              → AccountSelectorInline
  landing/              → SpiralBackground

lib/
  supabase/client.ts    → cliente Supabase singleton
  accounts.ts           → listMyAccounts, listMyAccountsWithProp
  profile.ts            → getMyProfile, upsertMyProfileDisplayName, toFriendlyMessage
  bootstrap.ts          → criação automática de contas padrão
  utils.ts              → cn()

---

## Convenções de código

### Componentes
- Sempre "use client" quando usa hooks ou eventos
- Named exports (não default) para componentes reutilizáveis
- Default export apenas para page.tsx
- Props tipadas com interface, nunca type inline em componentes

### Nomenclatura
- Componentes: PascalCase → JournalKpiCards.tsx
- Hooks: camelCase com use → useActiveAccount
- Funções utilitárias: camelCase → listMyAccountsWithProp
- Constantes: UPPER_SNAKE_CASE → STORAGE_KEY, SECTION_OVERVIEW
- Arquivos de página: sempre page.tsx (Next.js convention)
- Arquivos de componente: PascalCase.tsx

### Estilos
- Tailwind classes apenas — sem CSS modules, sem styled-components
- CSS variables para cores: hsl(var(--card)), hsl(var(--background)), etc.
- CRÍTICO: backgrounds nunca funcionam só com classe Tailwind bg-card —
  sempre usar style={{ backgroundColor: "hsl(var(--card))" }} inline
  junto com a classe, ou só o style inline
- Bordas arredondadas: rounded-[22px] para cards, rounded-full para pills/botões
- Animações: sempre Framer Motion com easeApple = [0.16, 1, 0.3, 1]
- Sombras: shadow-soft (light) / dark:shadow-soft-dark

### Hierarquia visual (layers)
- Layer 0: --background (cinza claro #f5f5f7 / escuro #111)
- Layer 1: --card (branco puro / cinza escuro) — cards, modais, dropdowns
- BGPattern (dots) fixo no body, z-0, opacity 0.12
- Cards usam isolate para não deixar dots aparecerem através

### Autenticação
- AuthGate em components/auth/AuthGate.tsx protege /app/**
- Logout: manual via localStorage (nunca supabase.auth.signOut() — trava)
- Magic link → /auth/callback → checa display_name → /onboarding ou /app
- Google OAuth → mesmo fluxo do magic link

### Supabase
- Cliente: sempre importar de @/lib/supabase/client
- Nunca usar .single() quando pode retornar null — usar .maybeSingle()
- Queries sempre com .eq("user_id", session.user.id) para RLS
- Tratamento de erro: sempre verificar error antes de usar data

### Estado global
- ActiveAccountContext: conta ativa persiste em localStorage (key: activeAccountId)
- ThemeProvider: tema persiste em localStorage (key: trading-dashboard-theme)
- Sem Redux, sem Zustand — Context API puro

### Padrões de página autenticada
- mx-auto max-w-6xl px-6 py-10 para layout principal
- h1: text-2xl font-semibold tracking-tight
- Subtítulo: text-sm text-muted-foreground
- Cards: <Card> component do shadcn com style inline para bg

### Database (Supabase)
Tabelas principais:
- auth.users → usuários (gerenciado pelo Supabase)
- profiles → { user_id, display_name }
- accounts → { id, user_id, name, kind, is_active }
- prop_accounts → { account_id, firm_name, phase, starting_balance_usd, ... }
- journal_trades → { id, account_id, user_id, symbol, direction, pnl_usd, ... }

### Problemas conhecidos e soluções
- bg-card transparente: usar style inline backgroundColor
- Logout travando: usar limpeza manual do localStorage
- AuthGate loop: nunca usar state global, sempre getSession() direto
- Onboarding loop: usar window.location.href em vez de router.replace

---

## Comportamento esperado do Claude Code

### Antes de qualquer implementação
1. Ler os arquivos relevantes antes de editar — nunca assumir o conteúdo
2. Entender o contexto da feature no projeto antes de propor solução
3. Perguntar se a intenção não estiver clara — não adivinhar
4. Verificar se já existe componente similar antes de criar um novo

### Ao implementar
- Seguir EXATAMENTE as convenções deste arquivo
- Nunca instalar dependências novas sem avisar e justificar
- Nunca alterar arquivos fora do escopo da tarefa pedida
- Nunca remover código existente sem confirmar
- Manter consistência visual com o restante do projeto
- Sempre tipar corretamente — zero `any`

### Ao criar componentes novos
- Verificar se existe versão no shadcn/ui antes de criar do zero
- Seguir o padrão visual dos cards existentes (rounded-[22px], style inline bg)
- Incluir suporte a dark mode (sempre usar CSS variables)
- Animações com Framer Motion + easeApple

### Ao mexer no Supabase
- Nunca expor secrets ou service_role key no client
- Sempre usar o cliente singleton de @/lib/supabase/client
- Confirmar com o usuário antes de criar/alterar tabelas ou políticas RLS

### O que NUNCA fazer
- Nunca usar supabase.auth.signOut() — usa limpeza manual
- Nunca usar .single() em queries que podem retornar null
- Nunca usar CSS modules ou styled-components
- Nunca usar Redux ou Zustand
- Nunca fazer router.replace() em fluxos de auth — usar window.location.href
- Nunca commitar .env ou qualquer secret

---

## Comandos úteis
npm run dev      → inicia dev server
npm run build    → build de produção
git add . && git commit -m "msg" && git push → deploy via Vercel (auto)
