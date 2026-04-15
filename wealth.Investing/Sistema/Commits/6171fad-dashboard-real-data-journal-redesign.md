---
type: commit
sha: 6171fad7e1846698ae4682d708f3624f4ad23e46
sha7: 6171fad
date: "2026-03-04T13:24:19-03:00"
author: Pedro
commit_type: other
scope: 
files_changed: 60
insertions: 6854
deletions: 583
tags: ["api", "route", "ui", "docs", "lib", "supabase"]
---

# checkpoint: dashboard real data + journal redesign

> Commit por **Pedro** em 2026-03-04T13:24:19-03:00
> 60 arquivo(s) — +6854 / −583

## Sessão

[[Sistema/Sessões/2026-03-04]]

## Arquivos tocados

- `.cursor/settings.json` [[Sistema/Arquivos/.cursor/settings.json|hub]]
- [[Sistema/Endpoints/app/api/journal/import-mt5/route.ts|app/api/journal/import-mt5/route.ts]]
- [[Sistema/Endpoints/app/api/news/route.ts|app/api/news/route.ts]]
- [[Sistema/Rotas/app/app/alerts/page.tsx|app/app/alerts/page.tsx]]
- [[Sistema/Rotas/app/app/journal/page.tsx|app/app/journal/page.tsx]]
- `app/app/layout.tsx` [[Sistema/Arquivos/app/app/layout.tsx|hub]]
- [[Sistema/Rotas/app/app/page.tsx|app/app/page.tsx]]
- [[Sistema/Rotas/app/app/prop/page.tsx|app/app/prop/page.tsx]]
- [[Sistema/Rotas/app/app/wallet/page.tsx|app/app/wallet/page.tsx]]
- [[Sistema/Rotas/app/auth/callback/page.tsx|app/auth/callback/page.tsx]]
- `app/globals.css` [[Sistema/Arquivos/app/globals.css|hub]]
- `app/layout.tsx` [[Sistema/Arquivos/app/layout.tsx|hub]]
- [[Sistema/Rotas/app/login/page.tsx|app/login/page.tsx]]
- [[Sistema/Rotas/app/onboarding/page.tsx|app/onboarding/page.tsx]]
- `app/page.tsx` [[Sistema/Arquivos/app/page.tsx|hub]]
- `components/account/AccountSelectorInline.tsx` [[Sistema/Arquivos/components/account/AccountSelectorInline.tsx|hub]]
- `components/auth/AuthGate.tsx` [[Sistema/Arquivos/components/auth/AuthGate.tsx|hub]]
- `components/auth/BootstrapWarning.tsx` [[Sistema/Arquivos/components/auth/BootstrapWarning.tsx|hub]]
- `components/brand/BrandMark.tsx` [[Sistema/Arquivos/components/brand/BrandMark.tsx|hub]]
- `components/brand/FirmIcon.tsx` [[Sistema/Arquivos/components/brand/FirmIcon.tsx|hub]]
- `components/context/ActiveAccountContext.tsx` [[Sistema/Arquivos/components/context/ActiveAccountContext.tsx|hub]]
- `components/journal/JournalEquityChart.tsx` [[Sistema/Arquivos/components/journal/JournalEquityChart.tsx|hub]]
- `components/journal/JournalKpiCards.tsx` [[Sistema/Arquivos/components/journal/JournalKpiCards.tsx|hub]]
- `components/journal/JournalTradesTable.tsx` [[Sistema/Arquivos/components/journal/JournalTradesTable.tsx|hub]]
- `components/journal/PnlCalendar.tsx` [[Sistema/Arquivos/components/journal/PnlCalendar.tsx|hub]]
- `components/journal/TradeDetailModal.tsx` [[Sistema/Arquivos/components/journal/TradeDetailModal.tsx|hub]]
- `components/journal/types.ts` [[Sistema/Arquivos/components/journal/types.ts|hub]]
- `components/layout/AppHeader.tsx` [[Sistema/Arquivos/components/layout/AppHeader.tsx|hub]]
- `components/layout/AppShell.tsx` [[Sistema/Arquivos/components/layout/AppShell.tsx|hub]]
- `components/layout/header.tsx` [[Sistema/Arquivos/components/layout/header.tsx|hub]]
- `components/login/LoginBackground.tsx` [[Sistema/Arquivos/components/login/LoginBackground.tsx|hub]]
- `components/ui/badge.tsx` [[Sistema/Arquivos/components/ui/badge.tsx|hub]]
- `components/ui/card.tsx` [[Sistema/Arquivos/components/ui/card.tsx|hub]]
- `components/ui/dialog.tsx` [[Sistema/Arquivos/components/ui/dialog.tsx|hub]]
- `components/ui/input.tsx` [[Sistema/Arquivos/components/ui/input.tsx|hub]]
- `components/ui/label.tsx` [[Sistema/Arquivos/components/ui/label.tsx|hub]]
- `components/ui/table.tsx` [[Sistema/Arquivos/components/ui/table.tsx|hub]]
- `docs/AUDIT-SUPABASE-REAL-DATABASE.md` [[Sistema/Arquivos/docs/AUDIT-SUPABASE-REAL-DATABASE.md|hub]]
- `docs/AUDIT-SUPABASE-SCHEMA-COMPATIBILITY.md` [[Sistema/Arquivos/docs/AUDIT-SUPABASE-SCHEMA-COMPATIBILITY.md|hub]]
- `docs/sql/audit-supabase-schema.sql` [[Sistema/Arquivos/docs/sql/audit-supabase-schema.sql|hub]]
- `lib/accounts.ts` [[Sistema/Arquivos/lib/accounts.ts|hub]]
- `lib/auth.ts` [[Sistema/Arquivos/lib/auth.ts|hub]]
- `lib/bootstrap/ensureDefaultAccounts.ts` [[Sistema/Arquivos/lib/bootstrap/ensureDefaultAccounts.ts|hub]]
- `lib/bootstrap/index.ts` [[Sistema/Arquivos/lib/bootstrap/index.ts|hub]]
- `lib/mt5-html-parser.ts` [[Sistema/Arquivos/lib/mt5-html-parser.ts|hub]]
- `lib/mt5-parser.ts` [[Sistema/Arquivos/lib/mt5-parser.ts|hub]]
- `lib/profile.ts` [[Sistema/Arquivos/lib/profile.ts|hub]]
- `lib/prop-stats.ts` [[Sistema/Arquivos/lib/prop-stats.ts|hub]]
- `lib/supabase/client.ts` [[Sistema/Arquivos/lib/supabase/client.ts|hub]]
- `lib/supabase/env.ts` [[Sistema/Arquivos/lib/supabase/env.ts|hub]]
