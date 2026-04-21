---
type: commit
sha: d9a76d4099be87fc9de5f233636517d61c1e202c
sha7: d9a76d4
date: "2026-04-20T01:13:44-03:00"
author: Pedro
commit_type: feat
scope: app
files_changed: 17
insertions: 159
deletions: 50
tags: ["feat", "app", "route", "ui", "lib"]
---

# feat(app): [C-02] consolidate entitlements — single source of truth

> Commit por **Pedro** em 2026-04-20T01:13:44-03:00
> 17 arquivo(s) — +159 / −50

## Sessão

[[Sistema/Sessões/2026-04-20]]

## Arquivos tocados

- [[Sistema/Rotas/app/app/ai-coach/page.tsx|app/app/ai-coach/page.tsx]]
- [[Sistema/Rotas/app/app/mentor/page.tsx|app/app/mentor/page.tsx]]
- [[Sistema/Rotas/app/app/settings/page.tsx|app/app/settings/page.tsx]]
- [[Sistema/Rotas/app/app/subscription/success/page.tsx|app/app/subscription/success/page.tsx]]
- `components/account/AddAccountModal.tsx` [[Sistema/Arquivos/components/account/AddAccountModal.tsx|hub]]
- `components/billing/PaywallGate.tsx` [[Sistema/Arquivos/components/billing/PaywallGate.tsx|hub]]
- `components/billing/PricingCards.tsx` [[Sistema/Arquivos/components/billing/PricingCards.tsx|hub]]
- `components/billing/SubscriptionBadge.tsx` [[Sistema/Arquivos/components/billing/SubscriptionBadge.tsx|hub]]
- `components/context/LiveMonitoringContext.tsx` [[Sistema/Arquivos/components/context/LiveMonitoringContext.tsx|hub]]
- `components/context/SubscriptionContext.tsx` [[Sistema/Arquivos/components/context/SubscriptionContext.tsx|hub]]
- `components/dashboard/SmartAlertsBanner.tsx` [[Sistema/Arquivos/components/dashboard/SmartAlertsBanner.tsx|hub]]
- `components/dashboard/WidgetRenderer.tsx` [[Sistema/Arquivos/components/dashboard/WidgetRenderer.tsx|hub]]
- `components/layout/AppSidebar.tsx` [[Sistema/Arquivos/components/layout/AppSidebar.tsx|hub]]
- `components/onboarding/ProOnboardingGuard.tsx` [[Sistema/Arquivos/components/onboarding/ProOnboardingGuard.tsx|hub]]
- `hooks/use-entitlements.ts` [[Sistema/Arquivos/hooks/use-entitlements.ts|hub]]
- `lib/entitlements.ts` [[Sistema/Arquivos/lib/entitlements.ts|hub]]
- `lib/hooks/useAppRoles.ts` [[Sistema/Arquivos/lib/hooks/useAppRoles.ts|hub]]

## Mensagem

- lib/entitlements.ts: hasAccess(plan, feature) + Feature union
- hooks/use-entitlements.ts: canonical hook, superset API
- SubscriptionContext: useSubscription kept as @deprecated thin wrapper
  (removal scheduled for C-11 post-merge cleanup)
- 14 callsites migrated atomically

Note: SubStatus past_due policy marked "assumed, needs confirmation"
in lib/entitlements.ts — review before production.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
