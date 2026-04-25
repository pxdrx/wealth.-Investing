# Smoke Transcript — wealth.Investing closeout sprint

> Text-based smoke walkthrough of the 12 logged-in routes covered by the
> mandate. **No live browser session was run** — this transcript is built
> from grep + code-read of the i18n keys actually wired in each route, so
> every "expected string" below is the literal string in
> `lib/i18n/app.ts` (or `messages/{pt,en}.json` for the auth namespace).
>
> Coverage that is partial (route still has hardcoded PT outside the named
> signature element) is flagged "PARTIAL" and cross-referenced to
> `handoff/FOUND-WHILE-CLOSING.md`.
>
> i18n parity baseline: **605 keys × 2 locales** in `messages/*.json`
> (next-intl) plus the typed `app.*` dict in `lib/i18n/app.ts`
> (~190 PT + ~190 EN keys, parity verified by `tsc` since both records
> share the `Dict` type and `keyof typeof PT` is the message-key alias).
>
> Date: 2026-04-25.

---

## Route walkthrough (signature element per route)

| # | Route | i18n namespace(s) | Signature key | PT | EN | Coverage |
|---|---|---|---|---|---|---|
| 1 | `/login` | `app.auth.*` (next-intl JSON) | `app.auth.tabs.signin` | `Entrar` | `Sign in` | Full (Day 1 [C4]) |
| 2 | `/app` (dashboard) | `app.*` (`dashboard.dayKpis.*`, `dashboard.dayTimeline.*`, `dashboard.widget.*`, `sidebar.nav.*`) | `dashboard.dayKpis.title.pnl` | `PnL hoje` | `Today's PnL` | PARTIAL — TodayMatters narrative copy already wired in pre-sprint wave; widget grid uses `dashboard.widget.*` after Day 5 [M1]. Other dashboard widgets have hardcoded narrative copy (deferred — see `FOUND-WHILE-CLOSING.md`). |
| 3 | `/app/journal` | `app.*` (`journal.*`, `journalKpis.*`, `journalView.*`, `equity.*`, `journalReports.*`, `breakdowns.*`, `pnlCalendar.*`, `psychologyAnalysis.*`, `psychologyLoading.*`) | `journal.tabs.overview` | `Visão Geral` | `Overview` | PARTIAL — `ImportResult.tsx` KPI labels + `DiscrepancyModal.tsx` interior + locale formatters (`toLocaleString`) deferred. Logged. |
| 4 | `/app/mentor` | `app.*` (`mentor.*`) | `mentor.section.studentPanel` | `Painel do Mentor` | `Mentor Panel` | PARTIAL — only section headers + unlinked empty state + rating label migrated. ~80–120 keys still PT (InviteCodeSection, StudentCard interior, NoteForm, StudentDetail table). Logged in detail. |
| 5 | `/app/prop` (Contas) | `app.*` (`prop.*`, `sidebar.nav.prop`) | `sidebar.nav.prop` | `Contas` | `Accounts` | Full (Day 3 [I5]). Internal slug `/app/prop` retained (not user-visible). Status chips OK / Risco, DD types Trailing/EOD/Estático, KPI labels — all migrated. |
| 6 | `/app/chart` | `app.*` (`chart.*`) | `chart.ticker.gold` | `Ouro` | `Gold` | Full (Day 4 [I6]). 7 ticker chips + page chrome. TradingView embed itself stays branded per `docs/licensing.md`. |
| 7 | `/app/backtest` | `app.*` (`backtest.*`) | `backtest.title` | `Backtest` | `Backtest` | PARTIAL — page chrome only. `BacktestSection` interior (KPIs, empty state) deferred. Logged. |
| 8 | `/app/macro` | `app.*` (`macro.*`) | `macro.tab.terminal` | `Terminal` | `Terminal` | PARTIAL — chrome (refresh dialog, tabs, 4 section headers, 4 KPIs, empty/toast) migrated. Inner panels (`AdaptiveAlerts`, `EconomicCalendar`, `InterestRatesPanel`, `SentimentCard`, `HeadlinesFeed`, `WeeklyHistory`, `WeeklyBriefing`) still PT. Logged. |
| 9 | `/app/dexter/chat` | `app.*` (`dexter.chat.*`, `dexter.commandHint.*`) | `dexter.chat.placeholder` | `Fala com o Ticker — digite / para comandos...` | `Talk to Ticker — type / for commands...` | Full (Day 4 [I9] + Day 5 [M4] hint). Slash command tooltips + menu chrome migrated. |
| 10 | `/app/dexter/coach` | `app.*` (`dexter.coach.*`) | `dexter.coach.section.quickActions` | `Ações Rápidas` | `Quick Actions` | Full (Day 4 [I9]) for the 2-col headers + analytics toggle + sync pill + placeholder states. Body content (free-form coach output) is locale-driven server-side via Claude prompt selection. |
| 11 | `/app/dexter/analyst` | `app.*` (`dexter.analyst.*`) | `dexter.analyst.searchPlaceholder` | `Bitcoin, Ouro, EURUSD, Apple, S&P 500...` | `Bitcoin, Gold, EURUSD, Apple, S&P 500...` | Full (Day 4 [I9]). |
| 12 | `/app/settings` | `app.*` (`settings.*`) | `settings.subscription.status.active` | `Ativo` | `Active` | Full (Day 2 [I10a] + Day 4 [I10b] + Day 5 [M1]). Stripe status map locale-aware (8 statuses). Delete-account confirmation gate accepts the localized token (`EXCLUIR` / `DELETE`) plus the PT literal as a permanent fallback. PT/EN toggle lives in Preferências (relocated Day 2 [H1]). Dashboard widget grid title uses `dashboard.widget.*`. |
| 13 | `/app/pricing` | `app.*` (`pricing.*`) | `pricing.tier.ultra.badge` | `MAIS POPULAR` | `MOST POPULAR` | Full (Day 3 [I11]). Typo `MAIS INTUITADOS` confirmed absent. 3 tier cards + 26 feature strings + 8 alert variants migrated. |

(13 entries because `/app/dexter/{chat,coach,analyst}` count as 3 distinct routes per the briefing's 12-route list — `/app` dashboard root + 9 children + `/login` + `/app/pricing` = 12 user-visible URLs; the Dexter trio breakdown is shown for clarity.)

---

## Cross-cutting i18n hardening (verified by inspection)

- **`IntlProviderSafe`** (pre-sprint, `adf783f`) — any missing key renders
  the dotted path as fallback instead of crashing. Verified untouched.
- **DB-backed locale persistence** (`profiles.preferred_locale`,
  `updateMyPreferredLocale`, `syncLocaleFromProfile`, `AuthGate`) —
  pre-sprint, untouched.
- **`LocaleSwitcher`** mounted in Settings > Preferências via
  `components/settings/LanguagePreference.tsx` (Day 2 [H1]). Removed from
  sidebar footer.
- **`useAppT()`** hook resolves the active next-intl locale and falls
  back to PT if the provider is absent. Type-safe (`AppMessageKey`).
- **i18n parity** enforced by `npm run i18n:check`
  (`scripts/check-i18n-parity.mjs`) on `messages/{pt,en}.json`. The
  typed `app.*` dict parity is enforced at compile time
  (`type Dict = Record<string, string>` + `keyof typeof PT`) — `tsc`
  fails if PT and EN drift.

---

## Known-deferred per-route (cross-reference)

See `handoff/FOUND-WHILE-CLOSING.md` for the full deferred list. Summary:

- Mentor route ~80–120 keys still PT (largest remaining surface).
- Macro inner panels still PT (7 components).
- Backtest interior (`BacktestSection`, 706 lines) still PT.
- Journal `ImportResult` + `DiscrepancyModal` still PT.
- All `toLocaleString("pt-BR" / "en-US")` formatters are still
  hardcoded — needs `useFormatter()` migration in a follow-up sprint.
- `/app/admin` intentionally untranslated (internal tool).
- Landing-tree `--landing-*` shim still defined in `app/globals.css`
  (authenticated-tree consumers migrated; landing-tree consumers
  remain — out of sprint scope per plan §0.0).

---

## Final gate evidence

(See `handoff/CLOSEOUT-LOG.md` Day 5 EOD section for the actual command
output of the final gate run.)

- `npm run i18n:check` — green at 605 × 2.
- `npx tsc --noEmit` — 0 errors.
- `npm test` (Vitest) — 129/129 passing.
- `npm run lint` — only pre-existing warnings (no new).
- `npm run build` — clean.
