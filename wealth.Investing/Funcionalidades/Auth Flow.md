---
tags: [feature, auth, supabase, oauth]
date: 2026-03-25
status: ativo
---

# Auth Flow

## Métodos de Login

1. **Email + Password** — cadastro e login tradicional
2. **Magic Link** — link enviado por email
3. **Google OAuth** — login social

## AuthGate

Componente `components/auth/AuthGate.tsx` que guarda `/app/**`:

1. Checa sessão em **cada mudança de pathname**
2. Se `expires_at` está no passado → refresh token
3. Escuta evento `SIGNED_OUT` → redireciona para `/login`
4. Após auth check → chama `ensureDefaultAccounts(userId)` em background

## Callback (`/auth/callback`)

1. Recebe code do OAuth/magic link
2. Troca por sessão
3. Valida parâmetro `next` contra open redirect:
   - Deve começar com `/`
   - Não pode começar com `//`
4. Checa se profile existe → se não, redireciona para `/onboarding`

## Regras Absolutas

> [!danger] NUNCA violar estas regras
> - **NUNCA** usar `supabase.auth.signOut()` — causa freeze
> - **NUNCA** usar `router.replace()` em auth flows — usar `window.location.href`
> - **NUNCA** usar `.single()` para queries que podem retornar null
> - **NUNCA** expor service_role key no client

## Logout

Logout manual via limpeza do localStorage (não usa `signOut()`).

## Known Issues

| Issue | Fix |
|-------|-----|
| `bg-card` transparente | Inline style com HSL |
| Logout freezes | Manual localStorage cleanup |
| AuthGate infinite loop | Usar `getSession()` direto |
| Onboarding redirect loop | `window.location.href` |

Ver: [[Arquitetura]], [[Supabase Schema]]

#feature #auth
