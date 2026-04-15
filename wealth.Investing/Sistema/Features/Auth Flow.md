---
type: feature
tags: [feature, auth, onboarding, security]
last_commit: 86468a1
last_updated: 2026-04-14
commits_count: 4
---

# Auth Flow

> Login, signup, forgot password, onboarding e AuthGate — fluxo completo de autenticação do app.

## Nova feature: Forgot Password

Implementado fluxo completo de recuperação de senha em [[Sistema/Commits/b33b0b5-implement-forgot-password-flow|b33b0b5]].

**Ajustes de comportamento** ([[Sistema/Commits/86468a1-hide-appshell-on-reset-password-clear-session-after-password|86468a1]]):
- `AppShell` escondido em `/reset-password` (página pública, sem chrome)
- Sessão limpa após atualização de senha — usuário é deslogado para relogar com credencial nova

## Onboarding

Tour para novos usuários + redirect de `/pricing` volta para home (commit `1d0c4bf`, via `fix(onboarding)` — nota Commit não gerada pelo hook; ver `git log`).

## Relacionado

- [[Funcionalidades/Auth Flow]] — design semântico
- [[Decisões/AI Coach Architecture]] — AuthGate patterns
- [[Aprendizados/Sempre Commit e Push]]
- [[Sistema/Features/Billing Stripe]] — safeGetSession no pricing
- [[Sistema/Sessões/2026-04-14]]
