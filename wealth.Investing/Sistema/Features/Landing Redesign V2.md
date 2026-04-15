---
type: feature
tags: [feature, landing, ui, marketing]
last_commit: 67144ff
last_updated: 2026-04-14
commits_count: 26
---

# Landing Redesign V2

> 7-section landing page com hero split + showcase interativo de 7 painéis, bento grid assimétrico e pricing unificado. Substitui a landing anterior inteira.

## O que é

Reescrita completa da home pública (`/`) em **26 commits no dia 14/04**, merge em [[Sistema/Commits/3e46ffd-merge-landing-redesign-v2-7-section-landing-interactive-hero|3e46ffd]]. Sete seções orquestradas em `app/page.tsx`:

1. **Hero split** — copy à esquerda, showcase interativo à direita ([[Sistema/Commits/593f030-rewrite-hero-as-split-interactive-showcase|593f030]])
2. **InteractiveFeatureShowcase** — tablist de 7 painéis clicáveis ([[Sistema/Commits/40c6a3b-add-interactivefeatureshowcase-with-7-panel-tablist|40c6a3b]])
3. **TrustBar** — logos de prop firms ([[Sistema/Commits/a827701-add-trustbar-with-prop-firm-logos|a827701]])
4. **BentoFeatures** — grade assimétrica 7-cell ([[Sistema/Commits/211bbc7-add-bentofeatures-7-cell-asymmetric-grid|211bbc7]])
5. **HowItWorks** — 3 passos numerados ([[Sistema/Commits/a5e06ae-add-howitworks-3-numbered-steps|a5e06ae]])
6. **PricingSummary** — resumo com redirect para `/pricing` ([[Sistema/Commits/d4670f4-add-pricingsummary-redirect-to-pricing|d4670f4]])
7. **FAQ/CTA final** — orquestrado em [[Sistema/Commits/fac5911-orchestrate-7-section-landing-in-app-page-tsx|fac5911]]

## Os 7 painéis interativos

Cada painel é um preview real da feature correspondente, registrado no `FEATURES` registry ([[Sistema/Commits/05462b7-add-featurekey-type-and-features-registry|05462b7]]):

- **JournalPanel** — KPIs + equity curve ([[Sistema/Commits/f52d163-add-journalpanel-kpis-equity-curve|f52d163]]) → [[Funcionalidades/Journal de Trades]]
- **AiCoachPanel** — 3 insight cards ([[Sistema/Commits/80bf199-add-aicoachpanel-3-insight-cards|80bf199]]) → [[Funcionalidades/AI Coach]]
- **MacroPanel** — 5 eventos com flags + impacto ([[Sistema/Commits/a38b1a6-add-macropanel-5-events-with-flags-impact|a38b1a6]]) → [[Funcionalidades/Calendário Econômico]]
- **DexterPanel** — relatório analista em 4 camadas ([[Sistema/Commits/1775a4a-add-dexterpanel-4-layer-analyst-report|1775a4a]]) → [[Funcionalidades/Analista de Ativos]]
- **BacktestPanel** — espelha a aba real de backtest ([[Sistema/Commits/773b5cf-add-backtestpanel-mirrors-real-backtest-tab|773b5cf]])
- **RiskPanel** — DD vermelho, profit verde ([[Sistema/Commits/3d5941a-add-riskpanel-dd-red-profit-green|3d5941a]])
- **MentorPanel** — 3 alunos com badges de status ([[Sistema/Commits/96a8f33-add-mentorpanel-3-students-with-status-badges|96a8f33]]) → [[Sistema/Features/Mentor Panel]]

Suporte: [[Sistema/Commits/4d17955-add-flagicon-us-eu-uk-jp-br|FlagIcon US/EU/UK/JP/BR (4d17955)]].

## Hardening + QA

- **Hardening pass**: crossfade, error boundary, defensive panel, a11y ([[Sistema/Commits/823cf36-hardening-pass-crossfade-error-boundary-defensive-panel-a11y|823cf36]])
- **Testes stress + a11y + smoke** ([[Sistema/Commits/11419cf-stress-a11y-smoke-tests-for-landing-redesign|11419cf]])
- **Vitest config** ampliado para `components/**/__tests__` ([[Sistema/Commits/703ebbf-configure-vitest-for-landing-component-tests|703ebbf]], [[Sistema/Commits/4336f49-extend-vitest-config-to-include-components-tests|4336f49]])
- Remoção das seções antigas substituídas ([[Sistema/Commits/73e3661-remove-deprecated-sections-replaced-by-redesign|73e3661]])

## Pós-merge — ajustes

- Split pills/screenshot, TrustBar centralizado, Journal bento enriquecido, tiers Free/Pro/Ultra corrigidos, página `/pricing` criada ([[Sistema/Commits/bd8e005-split-pills-screenshot-center-trustbar-enrich-journal-bento-|bd8e005]])
- **Pricing unificado** entre `/pricing` público e `/app/pricing` — removido jargão "Sharpe" ([[Sistema/Commits/1635f55-unify-pricing-visual-across-pricing-public-and-app-pricing-r|1635f55]])
- **Theme-aware colors** + smart auth CTA redirect ([[Sistema/Commits/16154d4-theme-aware-colors-smart-auth-cta-redirect|16154d4]])
- **Build fix** — `SmartCTALink` faltando ([[Sistema/Commits/8e7f7ea-add-missing-smartctalink-component-to-unblock-deploy|8e7f7ea]])
- **Links de preço unificados** → todos apontam para `/pricing` ([[Sistema/Commits/67144ff-unifica-links-de-precos-para-pricing|67144ff]])

## Relacionado

- [[Decisões/MVP Revenue Design]] — tiers Free/Pro/Ultra
- [[Decisões/Design Direction]] — Apple-like, sem neon
- [[Projeto/Design System]] — Lumina Slate tokens
- [[Funcionalidades/Billing Stripe]] — pricing gating
- [[Sistema/Sessões/2026-04-14]] — dia do merge
- [[Sistema/Features/Mentor Panel]] — painel integrado no showcase
