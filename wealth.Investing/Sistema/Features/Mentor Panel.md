---
type: feature
tags: [feature, mentor, access-control, onboarding]
last_commit: 4d0d480
last_updated: 2026-04-14
commits_count: 9
---

# Mentor Panel

> Área restrita para usuários com `plan=mentor` acompanharem alunos. Exclusivamente grátis (sem tier pago), gate rígido para admin/pro/ultra fora.

## Estado atual (14/04)

Painel funcional com per-account KPIs, busca, balance, sotaques visuais e fetch paralelo ([[Sistema/Commits/4b1c599-mentor-panel-per-account-kpis-search-balance-accents-paralle|4b1c599]]). Novos mentores veem modal de **3 passos de onboarding** no primeiro acesso ([[Sistema/Commits/d49e60a-3-step-onboarding-modal-on-first-visit-to-mentor-area|d49e60a]]).

## Controle de acesso

- **Gate por plano `mentor` apenas** — admin/pro/ultra bloqueados ([[Sistema/Commits/21fed31-gate-routes-page-to-plan-mentor-only-admin-pro-ultra-now-blo|21fed31]], duplicada em [[Sistema/Commits/21f724e-gate-routes-page-to-plan-mentor-only-admin-pro-ultra-now-blo|21f724e]])
- **Sem cache** nas rotas de mentor — força dados frescos ([[Sistema/Commits/77bca9b-force-fresh-data-on-mentor-routes-no-cache|77bca9b]])
- **MENTOR_TIERS pricing removido** — acesso gratuito ([[Sistema/Commits/aa4733a-remove-dead-mentor-tiers-pricing-mentor-access-is-free|aa4733a]])
- **Mentor-link escondido no settings** para quem já é mentor ([[Sistema/Commits/dc8a8d6-hide-mentor-link-section-for-users-who-are-already-mentors|dc8a8d6]])

## Correções críticas do dia

- **Infinite load ao selecionar aluno** + vazamento de backtest + label de contas de aluno ([[Sistema/Commits/4d0d480-infinite-load-on-student-select-backtest-leak-label-student-|4d0d480]])
- **Mentor views SQL** — colunas corretas `opened_at`/`closed_at` + invite badge mais limpo ([[Sistema/Commits/2045ea3-mentor-views-correct-column-names-opened-at-closed-at-and-cl|2045ea3]])

## Landing integration

O painel ganhou representação visual na landing redesign ([[Sistema/Commits/96a8f33-add-mentorpanel-3-students-with-status-badges|MentorPanel 96a8f33]]) — parte do [[Sistema/Features/Landing Redesign V2]].

## Relacionado

- [[Sistema/Features/Landing Redesign V2]]
- [[Funcionalidades/Auth Flow]] — plan resolution
- [[Sistema/Rotas]] — `/app/mentor/**`
- [[Sistema/Sessões/2026-04-14]]
