---
tags: [projeto, auditoria, segurança, qualidade]
date: 2026-03-28
status: completo
---

# Audit Forense — 2026-03-28

## Resumo Executivo

Auditoria forense completa da aplicação wealth.Investing realizada em 2026-03-28.
**105 findings identificados e 105 resolvidos (100%).**

11 commits, 103 arquivos alterados, 1497 inserções, 627 deleções.

## Scores (Antes → Depois)

| Dimensão | Antes | Depois |
|----------|-------|--------|
| Segurança | 5/10 | ~9/10 |
| Performance | 7/10 | ~9/10 |
| Design/UX | 5.5/10 | ~8.5/10 |
| Qualidade de Código | 6.5/10 | ~9/10 |
| Acessibilidade | 4.5/10 | ~8/10 |
| **Geral** | **5.5/10** | **~8.5/10** |

## Findings por Severidade

| Severidade | Total | Resolvido |
|------------|-------|-----------|
| CRITICAL | 23 | 23 ✅ |
| HIGH | 29 | 29 ✅ |
| MEDIUM | 33 | 33 ✅ |
| LOW | 16 | 16 ✅ |
| **Total** | **105** | **105** ✅ |

## Principais Mudanças

### Segurança
- **RLS hardening:** macro_events INSERT restrito a service_role, prop_alerts com políticas completas
- **SECURITY DEFINER:** 3 funções agora com `SET search_path = public` e validação `auth.uid()`
- **Rate limiter:** substituído Map in-memory por query no Supabase (3 req/min)
- **CSP header:** Content-Security-Policy com whitelist estrita de domínios
- **Middleware:** guard de cookie no `/app/**` (defense-in-depth)
- **Error sanitization:** mensagens genéricas em 13+ API routes
- **Sentry PII:** scrubbing de tokens, emails, senhas
- **Billing:** verificação de session_id do Stripe no success page

### Performance
- **AuthEventContext:** 1 listener centralizado substitui 3 redundantes
- **Dashboard hooks:** extraído useDashboardData + useNewsData do componente de 1231 linhas
- **Journal pagination:** 100 trades por página com "Carregar mais"
- **SpiralBackground:** rAF loop pausa quando não visível
- **Macro polling:** verifica visibilityState antes de refetch
- **requireEnv():** substitui 48+ non-null assertions em 16 API routes

### UX & Acessibilidade
- **Mobile navigation:** bottom tab bar com 5 tabs para /app/**
- **Border radius:** consolidado para 22px em cards (19+ arquivos)
- **WCAG AA:** contraste muted-foreground corrigido, labels em inputs, aria-labels em botões
- **SEO metadata:** 6 páginas públicas com título e descrição
- **Responsive:** grids colapsam em mobile, touch targets >= 44px
- **Portuguese:** 15+ acentos corrigidos na UI

### Cálculos Financeiros
- **Sharpe/Sortino:** agora subtrai taxa risk-free (5%/252 diário)
- **Drawdown:** já corrigido (inicia do starting_balance, não zero)
- **MT5 timezone:** XLSX parser alinhado com HTML parser (-2h UTC)

## Commits

```
8f2bf62 fix(audit): SEC-031 schema migrations + TECH-024 eslint deps + TECH-034 server components
a57ec95 fix(security+perf): SEC-028 middleware auth guard + TECH-022 journal pagination
50b7b37 refactor(arch): TECH-018 single AuthEventProvider + TECH-029 dashboard hooks extraction
f1c4c00 fix(audit): resolve LOW severity findings — security, polish, accessibility
752af58 fix(ux): resolve HIGH+MEDIUM UX and accessibility findings
d32b3c5 fix(technical): resolve HIGH technical findings from forensic audit
721fe53 fix(audit): resolve HIGH+MEDIUM security and technical findings
a68c7c8 fix(design): UX-003/004 — standardize border radius to 22px design token
48ae407 fix(security): SEC-001 DB-based rate limiter + SEC-010 CSP header
518efc7 feat(ux): UX-001 — add mobile bottom tab bar navigation for /app/**
6e1a709 fix(security): SEC-006/007/008 — harden Supabase RLS and SECURITY DEFINER functions
```

## Arquivos Criados

- `components/layout/AppMobileNav.tsx` — bottom tab bar mobile
- `components/context/AuthEventContext.tsx` — provider centralizado de auth events
- `hooks/useDashboardData.ts` — hook de dados do dashboard
- `hooks/useNewsData.ts` — hook de dados de notícias
- `app/api/billing/verify-session/route.ts` — verificação de sessão Stripe
- 6 `layout.tsx` para SEO em páginas "use client"
- 6 migrations Supabase (segurança + schema docs)

## Relatório Completo

Ver: `docs/forensic-audit-2026-03-28.md` — relatório detalhado com todos os 105 findings.

> [!tip] Próximos Passos
> Com o audit completo, a aplicação está pronta para Fase 3 features:
> Psychology tags, AI Q&A, MFE/MAE, analytics expandidos.

#projeto #auditoria #segurança #qualidade
