# Track C — Changes

Branch: `feat/track-c-app`
Target: `main`
Scope: `/app/**` authenticated area.

---

## Tasks shipped

| ID | Summary | Commit |
|----|---------|--------|
| C-01 | Unified AppSidebar | `ef39c05` |
| C-02 | Consolidate entitlements | `d9a76d4` |
| C-03 | Dexter "Hoje, isso importa" hero card | `9d3f791` |
| C-04 | Day KPIs + Timeline | `a9f980f` |
| C-05 | Retire legacy widgets (reorganize by route) | `bf902e2` |
| C-06 | Unified Dexter shell + tab routing | `a39e6df` |
| C-07 | JournalViewToggle + TradeNarrativeCard + DexterTradeDebrief | `166adbf`→`95710cf` |
| C-08 | Journal empty state as guided onboarding | `672b176` |
| — | Fix next-intl build break (cross-track) | `5090b93` |
| C-09 | Macro Terminal 5-4-3 grid | `b3508e7` |
| C-10 | Macro "Só meus ativos" filter | `353f154` |
| C-11 | Unify Dexter — delete ai-coach/analyst | `4ac16c0` |
| C-12 | Ultra-lock MT5 Live | `fceae61` |
| C-13 | Prop firms overview by `firm_name` | `e0f5faf` |
| C-14 | PDF export via print stylesheet | `a988784` |
| C-15 | i18n app.* namespace (typed dict, partial) | `9b4bdba` |

## Partial / blocked

- **C-15** shipped as [PARTIAL]. Track C owns `lib/i18n/app.ts` with PT + EN
  dicts plus `useAppT()` hook. Full next-intl message tree integration was
  deferred because `messages/{pt,en}.json` is Track B owned. When Track B
  merges, fold keys into `app.*` namespace.

---

## New files

```
components/journal/JournalEmptyOnboarding.tsx
components/macro/MyAssetsFilter.tsx
components/live/LiveLockCard.tsx
components/prop/PropFirmsOverview.tsx
hooks/useMyAssets.ts
hooks/useAppLocale.ts
lib/macro/asset-currency-map.ts
lib/i18n/app.ts
```

## Deleted

```
app/app/ai-coach/        (migrated to app/app/dexter/coach)
app/app/analyst/         (migrated to app/app/dexter/analyst)
```

## Redirect table (next.config.mjs)

- `/ai-coach*` → `/app/dexter/coach`  (permanent)
- `/app/ai-coach*` → `/app/dexter/coach`  (permanent)
- `/analyst*` → `/app/dexter/analyst`  (permanent)
- `/app/analyst*` → `/app/dexter/analyst`  (permanent)

---

## Manual smoke checklist

- [ ] Login → `/app` loads without error.
- [ ] `/app/journal` with a fresh account shows the new guided empty state
  (Import MT5 + Add manual + "O que Dexter faz" promise row).
- [ ] `/app/macro` Terminal tab renders the 5-4-3 grid on desktop and
  collapses to single column on mobile.
- [ ] `/app/macro` → toggle "Só meus ativos" narrows calendar, rates and
  headlines to currencies derived from recent journal trades.
- [ ] Hit `/app/ai-coach` → 301 redirect to `/app/dexter/coach`.
- [ ] Hit `/app/analyst` → 301 redirect to `/app/dexter/analyst`.
- [ ] Free-plan user → `/app` shows `LiveLockCard` (Ultra CTA) instead of
  the MT5 monitoring widget.
- [ ] `/app/prop` shows "Por Firma" rollup cards above the per-account grid.
- [ ] `/app/journal` → Reports tab → click Exportar PDF → browser print
  dialog opens, page header shows brandmark.
- [ ] Journal header + Macro header display translated labels when
  next-intl locale is `en` (fallback to PT if provider missing).

## Follow-ups (post-merge)

- **Deferred:** fold `lib/i18n/app.ts` into `messages/{pt,en}.json` under the
  `app.*` namespace. Requires wrapping `/app/**` with `NextIntlClientProvider`
  (currently only `/[locale]/**` is wrapped). Out of scope for finalize.
- **Resolved:** Track A shipped `Dexter` in place of the original Mascot
  concept; `components/brand/index.ts` now exports it, and
  `components/dashboard/TodayMatters.tsx` consumes it directly.
- Replace `/app/ai-coach` file-system fallbacks if any external link still
  points there (redirect handles it, but update internal docs).
