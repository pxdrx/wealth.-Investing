---
tags: [projeto, stack, tecnologia]
date: 2026-03-25
---

# Stack Técnico

## Core

### Next.js 14 (App Router)
- **Sem Pages Router** — apenas App Router
- ISR para API de notícias (5min revalidate)
- API Routes para webhooks e importação
- Middleware passivo (auth é client-side)

### TypeScript (Strict)
- Zero `any` — sempre tipar corretamente
- Props tipadas com `interface`, nunca inline type
- Strict mode habilitado

### Tailwind CSS + shadcn/ui
- Radix primitives via shadcn
- CSS variables para cores: `hsl(var(--card))`
- **CRITICAL:** `bg-card` sozinho não funciona — sempre usar inline style
- Ver: [[Design System]], [[Convenções de Código]]

### Supabase
- **Auth:** OAuth (Google) + Magic Link + Email/Password
- **Database:** Postgres com RLS em todas as tabelas
- **Client:** Singleton no browser, Bearer token pattern no server
- Ver: [[Supabase Schema]], [[Auth Flow]]

## Libs Complementares

| Lib | Uso |
|-----|-----|
| Framer Motion | Animações com `easeApple = [0.16, 1, 0.3, 1]` |
| Recharts | Gráficos de PnL, equity curves |
| lucide-react | Ícones consistentes |
| XLSX | Parsing de relatórios MT5 (Excel) |
| Cheerio | Parsing de relatórios MT5 (HTML) |
| Anthropic SDK | AI Coach (Claude Haiku/Sonnet) |
| Stripe | Pagamentos (card + Pix) |
| Sentry | Error tracking |
| canvas-confetti | Efeito na pricing page |
| @number-flow/react | Animação de números |

## Infraestrutura

| Serviço | Função |
|---------|--------|
| Vercel | Hosting + auto-deploy |
| Supabase | Database + Auth |
| Stripe | Billing |
| Sentry | Monitoramento |

> [!warning] Cron Limitation
> Vercel Hobby limita crons a execução diária. Upgrade necessário para crons mais frequentes.
> Ver: [[Cron Jobs]]

#projeto #stack #tecnologia
