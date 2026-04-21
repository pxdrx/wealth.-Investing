---
type: commit
sha: 4ac16c0b65d67ecde64a75feccf0bb04d5d39e16
sha7: 4ac16c0
date: "2026-04-20T22:52:13-03:00"
author: Pedro
commit_type: feat
scope: app
files_changed: 76
insertions: 3090
deletions: 1919
tags: ["feat", "app", "route", "ui", "docs", "lib"]
---

# feat(app): [C-11] consolidate Dexter - move ai-coach/analyst under dexter

> Commit por **Pedro** em 2026-04-20T22:52:13-03:00
> 76 arquivo(s) — +3090 / −1919

## Sessão

[[Sistema/Sessões/2026-04-20]]

## Arquivos tocados

- [[Sistema/Rotas/app/app/ai-coach/page.tsx|app/app/ai-coach/page.tsx]]
- [[Sistema/Rotas/app/app/analyst/page.tsx|app/app/analyst/page.tsx]]
- `app/app/dexter/analyst/loading.tsx` [[Sistema/Arquivos/app/app/dexter/analyst/loading.tsx|hub]]
- [[Sistema/Rotas/app/app/dexter/analyst/page.tsx|app/app/dexter/analyst/page.tsx]]
- `app/app/dexter/coach/loading.tsx` [[Sistema/Arquivos/app/app/dexter/coach/loading.tsx|hub]]
- [[Sistema/Rotas/app/app/dexter/coach/page.tsx|app/app/dexter/coach/page.tsx]]
- `components/journal/ImportResult.tsx` [[Sistema/Arquivos/components/journal/ImportResult.tsx|hub]]
- `docs/TRACK-ROADMAP.md` [[Sistema/Arquivos/docs/TRACK-ROADMAP.md|hub]]
- `lib/landing-data.ts` [[Sistema/Arquivos/lib/landing-data.ts|hub]]
- `tsconfig.tsbuildinfo` [[Sistema/Arquivos/tsconfig.tsbuildinfo|hub]]
- `wealth.Investing/Sistema/Arquivos/.gitignore.md` [[Sistema/Arquivos/wealth.Investing/Sistema/Arquivos/.gitignore.md|hub]]
- `wealth.Investing/Sistema/Arquivos/app/_locale_/layout.tsx.md` [[Sistema/Arquivos/wealth.Investing/Sistema/Arquivos/app/_locale_/layout.tsx.md|hub]]
- `wealth.Investing/Sistema/Arquivos/app/_locale_/page.tsx.md` [[Sistema/Arquivos/wealth.Investing/Sistema/Arquivos/app/_locale_/page.tsx.md|hub]]
- `wealth.Investing/Sistema/Arquivos/app/api/dashboard/today-stats/route.ts.md` [[Sistema/Arquivos/wealth.Investing/Sistema/Arquivos/app/api/dashboard/today-stats/route.ts.md|hub]]
- `wealth.Investing/Sistema/Arquivos/app/app/ai-coach/page.tsx.md` [[Sistema/Arquivos/wealth.Investing/Sistema/Arquivos/app/app/ai-coach/page.tsx.md|hub]]
- `wealth.Investing/Sistema/Arquivos/app/app/backtest/page.tsx.md` [[Sistema/Arquivos/wealth.Investing/Sistema/Arquivos/app/app/backtest/page.tsx.md|hub]]
- `wealth.Investing/Sistema/Arquivos/app/app/chart/page.tsx.md` [[Sistema/Arquivos/wealth.Investing/Sistema/Arquivos/app/app/chart/page.tsx.md|hub]]
- `wealth.Investing/Sistema/Arquivos/app/app/journal/page.tsx.md` [[Sistema/Arquivos/wealth.Investing/Sistema/Arquivos/app/app/journal/page.tsx.md|hub]]
- `wealth.Investing/Sistema/Arquivos/app/app/macro/page.tsx.md` [[Sistema/Arquivos/wealth.Investing/Sistema/Arquivos/app/app/macro/page.tsx.md|hub]]
- `wealth.Investing/Sistema/Arquivos/app/app/mentor/page.tsx.md` [[Sistema/Arquivos/wealth.Investing/Sistema/Arquivos/app/app/mentor/page.tsx.md|hub]]
- `wealth.Investing/Sistema/Arquivos/app/app/page.tsx.md` [[Sistema/Arquivos/wealth.Investing/Sistema/Arquivos/app/app/page.tsx.md|hub]]
- `wealth.Investing/Sistema/Arquivos/app/app/prop/page.tsx.md` [[Sistema/Arquivos/wealth.Investing/Sistema/Arquivos/app/app/prop/page.tsx.md|hub]]
- `wealth.Investing/Sistema/Arquivos/app/app/settings/page.tsx.md` [[Sistema/Arquivos/wealth.Investing/Sistema/Arquivos/app/app/settings/page.tsx.md|hub]]
- `wealth.Investing/Sistema/Arquivos/app/app/subscription/success/page.tsx.md` [[Sistema/Arquivos/wealth.Investing/Sistema/Arquivos/app/app/subscription/success/page.tsx.md|hub]]
- `wealth.Investing/Sistema/Arquivos/components/account/AddAccountModal.tsx.md` [[Sistema/Arquivos/wealth.Investing/Sistema/Arquivos/components/account/AddAccountModal.tsx.md|hub]]
- `wealth.Investing/Sistema/Arquivos/components/billing/PaywallGate.tsx.md` [[Sistema/Arquivos/wealth.Investing/Sistema/Arquivos/components/billing/PaywallGate.tsx.md|hub]]
- `wealth.Investing/Sistema/Arquivos/components/billing/PricingCards.tsx.md` [[Sistema/Arquivos/wealth.Investing/Sistema/Arquivos/components/billing/PricingCards.tsx.md|hub]]
- `wealth.Investing/Sistema/Arquivos/components/billing/SubscriptionBadge.tsx.md` [[Sistema/Arquivos/wealth.Investing/Sistema/Arquivos/components/billing/SubscriptionBadge.tsx.md|hub]]
- `wealth.Investing/Sistema/Arquivos/components/brand/index.ts.md` [[Sistema/Arquivos/wealth.Investing/Sistema/Arquivos/components/brand/index.ts.md|hub]]
- `wealth.Investing/Sistema/Arquivos/components/context/LiveMonitoringContext.tsx.md` [[Sistema/Arquivos/wealth.Investing/Sistema/Arquivos/components/context/LiveMonitoringContext.tsx.md|hub]]
- `wealth.Investing/Sistema/Arquivos/components/context/SubscriptionContext.tsx.md` [[Sistema/Arquivos/wealth.Investing/Sistema/Arquivos/components/context/SubscriptionContext.tsx.md|hub]]
- `wealth.Investing/Sistema/Arquivos/components/dashboard/DayKpis.tsx.md` [[Sistema/Arquivos/wealth.Investing/Sistema/Arquivos/components/dashboard/DayKpis.tsx.md|hub]]
- `wealth.Investing/Sistema/Arquivos/components/dashboard/DayTimeline.tsx.md` [[Sistema/Arquivos/wealth.Investing/Sistema/Arquivos/components/dashboard/DayTimeline.tsx.md|hub]]
- `wealth.Investing/Sistema/Arquivos/components/dashboard/SmartAlertsBanner.tsx.md` [[Sistema/Arquivos/wealth.Investing/Sistema/Arquivos/components/dashboard/SmartAlertsBanner.tsx.md|hub]]
- `wealth.Investing/Sistema/Arquivos/components/dashboard/StreaksWidget.tsx.md` [[Sistema/Arquivos/wealth.Investing/Sistema/Arquivos/components/dashboard/StreaksWidget.tsx.md|hub]]
- `wealth.Investing/Sistema/Arquivos/components/dashboard/TodayMatters.tsx.md` [[Sistema/Arquivos/wealth.Investing/Sistema/Arquivos/components/dashboard/TodayMatters.tsx.md|hub]]
- `wealth.Investing/Sistema/Arquivos/components/dashboard/TopSymbolsWidget.tsx.md` [[Sistema/Arquivos/wealth.Investing/Sistema/Arquivos/components/dashboard/TopSymbolsWidget.tsx.md|hub]]
- `wealth.Investing/Sistema/Arquivos/components/dashboard/WidgetRenderer.tsx.md` [[Sistema/Arquivos/wealth.Investing/Sistema/Arquivos/components/dashboard/WidgetRenderer.tsx.md|hub]]
- `wealth.Investing/Sistema/Arquivos/components/journal/DexterTradeDebrief.tsx.md` [[Sistema/Arquivos/wealth.Investing/Sistema/Arquivos/components/journal/DexterTradeDebrief.tsx.md|hub]]
- `wealth.Investing/Sistema/Arquivos/components/journal/JournalEmptyOnboarding.tsx.md` [[Sistema/Arquivos/wealth.Investing/Sistema/Arquivos/components/journal/JournalEmptyOnboarding.tsx.md|hub]]
- `wealth.Investing/Sistema/Arquivos/components/journal/JournalViewToggle.tsx.md` [[Sistema/Arquivos/wealth.Investing/Sistema/Arquivos/components/journal/JournalViewToggle.tsx.md|hub]]
- `wealth.Investing/Sistema/Arquivos/components/journal/TradeNarrativeCard.tsx.md` [[Sistema/Arquivos/wealth.Investing/Sistema/Arquivos/components/journal/TradeNarrativeCard.tsx.md|hub]]
- `wealth.Investing/Sistema/Arquivos/components/journal/TradeNarrativeList.tsx.md` [[Sistema/Arquivos/wealth.Investing/Sistema/Arquivos/components/journal/TradeNarrativeList.tsx.md|hub]]
- `wealth.Investing/Sistema/Arquivos/components/layout/AppSidebar.tsx.md` [[Sistema/Arquivos/wealth.Investing/Sistema/Arquivos/components/layout/AppSidebar.tsx.md|hub]]
- `wealth.Investing/Sistema/Arquivos/components/macro/MyAssetsFilter.tsx.md` [[Sistema/Arquivos/wealth.Investing/Sistema/Arquivos/components/macro/MyAssetsFilter.tsx.md|hub]]
- `wealth.Investing/Sistema/Arquivos/components/onboarding/ProOnboardingGuard.tsx.md` [[Sistema/Arquivos/wealth.Investing/Sistema/Arquivos/components/onboarding/ProOnboardingGuard.tsx.md|hub]]
- `wealth.Investing/Sistema/Arquivos/docs/BUILD-DEBT.md.md` [[Sistema/Arquivos/wealth.Investing/Sistema/Arquivos/docs/BUILD-DEBT.md.md|hub]]
- `wealth.Investing/Sistema/Arquivos/docs/TRACK-ROADMAP.md.md` [[Sistema/Arquivos/wealth.Investing/Sistema/Arquivos/docs/TRACK-ROADMAP.md.md|hub]]
- `wealth.Investing/Sistema/Arquivos/hooks/use-entitlements.ts.md` [[Sistema/Arquivos/wealth.Investing/Sistema/Arquivos/hooks/use-entitlements.ts.md|hub]]
- `wealth.Investing/Sistema/Arquivos/hooks/useMyAssets.ts.md` [[Sistema/Arquivos/wealth.Investing/Sistema/Arquivos/hooks/useMyAssets.ts.md|hub]]

## Mensagem

- Move app/app/ai-coach/* content into app/app/dexter/coach/ (overwrites stub).
- Move app/app/analyst/* content into app/app/dexter/analyst/ (overwrites stub).
- Delete app/app/ai-coach and app/app/analyst entirely.
- Rewrite internal /app/ai-coach and /app/analyst URLs to /app/dexter/*.
- Update lib/landing-data.ts and components/journal/ImportResult.tsx links.

Redirects 301 already in next.config.mjs from C-06; old paths keep working
for external links. Roadmap: mark C-11 SHIPPED.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
