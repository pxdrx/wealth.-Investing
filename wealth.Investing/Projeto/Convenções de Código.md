---
tags: [projeto, convenções, padrões, código]
date: 2026-03-25
---

# Convenções de Código

## Components

- Sempre `"use client"` quando usar hooks ou eventos
- Named exports para componentes reutilizáveis
- Default export **apenas** para `page.tsx`
- Props tipadas com `interface`, nunca inline type

## Naming

| Tipo | Convenção | Exemplo |
|------|-----------|---------|
| Components | PascalCase | `JournalKpiCards.tsx` |
| Hooks | camelCase com `use` | `useActiveAccount` |
| Utilities | camelCase | `listMyAccountsWithProp` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRIES` |

## Styling

- **Apenas Tailwind** — sem CSS modules, sem styled-components
- CSS variables para cores: `hsl(var(--card))`, `hsl(var(--background))`

> [!warning] Bug Conhecido
> `bg-card` sozinho é **transparente** em alguns contextos.
> **SEMPRE** adicionar `style={{ backgroundColor: "hsl(var(--card))" }}` inline.

- Cards: `rounded-[22px]`
- Pills/buttons: `rounded-full`
- Animações: Framer Motion com `easeApple = [0.16, 1, 0.3, 1]`
- Shadows: `shadow-soft` (light) / `dark:shadow-soft-dark`
- Landing page: `shadow-landing-card`, `shadow-landing-card-hover`

## Visual Layer Hierarchy

| Layer | CSS Variable | Valor |
|-------|-------------|-------|
| Layer 0 (fundo) | `--background` | #f5f5f7 light / #111 dark |
| Layer 1 (cards) | `--card` | white / dark gray |
| BGPattern | dots fixed, z-0, opacity 0.12 | — |

> Cards usam `isolate` para evitar dots bleeding through.

## API Routes

- Auth: extrair Bearer token → `createSupabaseClientForUser(token)`
- Response: `{ ok: boolean, error?: string, ...data }`
- Webhooks: `crypto.timingSafeEqual()` para comparação de secrets
- Import MT5: dedup por `user_id + account_id + external_source + external_id`

## Query Conventions (Supabase)

- Sempre `.maybeSingle()` para lookups que podem retornar null
- Sempre `.eq("user_id", session.user.id)` para RLS
- Sempre checar `error` antes de usar `data`
- Sorting de accounts: `is_active DESC` → kind → `created_at ASC`
- Profile PGRST116 = "no rows found" — tratar como null

## Regras Absolutas

- ❌ NUNCA usar `any`
- ❌ NUNCA commitar `.env` ou secrets
- ❌ NUNCA usar `.single()` para queries que podem retornar null
- ❌ NUNCA instalar deps sem justificar
- ❌ NUNCA modificar fora do escopo solicitado
- ✅ SEMPRE ler arquivo antes de editar
- ✅ SEMPRE checar se componente similar existe antes de criar novo

Ver: [[Design System]], [[Arquitetura]]

#projeto #convenções #código
