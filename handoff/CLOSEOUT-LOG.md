# Closeout Sprint — Running Log

Branch: `closeout/sprint-final` off `main@7c16158a`.
Base commit: `7c16158ae5e117a4c909500b5f81cab30f18651f` (fix(i18n): remove onError/getMessageFallback server→client function props).
Plan: `handoff/CLOSEOUT-PLAN.md`.

---

## Day 1 — 2026-04-23

### Setup
- Branch created off `7c16158a` (main had advanced to `d857b47c` with an unrelated NinjaTrader journal fix; per user, base stays at `7c16158a`).
- Initialized `handoff/CLOSEOUT-LOG.md` + `handoff/FOUND-WHILE-CLOSING.md`.

### D1-01 `[C1]` — typo `MAIS INTUITADOS` verification
- **No commit.** Grep across `*.ts`/`*.tsx`/`*.json` (excluding vault, handoff, briefing): zero matches.
- User confirmed: typo already fixed upstream; do not reintroduce. Staging check deferred to user.
- `components/billing/PricingCards.tsx:48` currently reads `badge: "Mais popular"`. Full PricingCards i18n pass scheduled for D3-04 `[I11]`.
- Mandate §1.5 satisfied.

### D1-02 `[C2]` i18n LiveLockCard — commit `5643d18c`
- Added `app.liveLock.*` namespace (4 keys) to `messages/{pt,en}.json`.
- `components/live/LiveLockCard.tsx` switched to `useTranslations("app.liveLock")`.
- Gates: `i18n:check` 493×2 ✓, `eslint <file>` clean, `tsc --noEmit` clean, `npm test` 52 passed.
- **Incident:** first commit (`81c072e4`) included an orphan pre-staged file (`lib/xlsx-adaptive-bridge.ts`) from a prior session. Soft-reset + unstage + recommit as `5643d18c`. User authorized the rewind (local branch, not pushed). Going forward: `git diff --cached --name-only` check before every commit.

### D1-03 `[C4]` i18n /login full bilingual pass — commit `fe8379de`
- Migrated `app/login/page.tsx` to `useTranslations("app.auth")`. Covers hero column, mobile titles, 3 tab labels, 4 forms (signin/signup/magic/forgot), all loading states, Google/OR/ENCRYPTED, 7 errors + 4 info messages. Removed "SENHA"/"ENCRYPTED" PT+EN mix.
- Added 35 new keys to `app.auth` namespace. i18n parity: 528×2.
- Gates: tsc clean on login, eslint clean on login, 52 tests pass, i18n:check green.

### D1-04 + D1-05 `[C3]` Dexter 3 missing poses — commit `6d4077a8`
- Added `public/dexter/celebrating.svg`, `sleeping.svg`, `analyzing.svg` — 16×16 pixel-art in the existing 4-green phosphor palette + `crispEdges`, no gradients, no new hex.
- Updated `components/brand/Dexter.tsx` `MOOD_TO_POSE` to map each of the 7 moods 1:1 to its own SVG (previously `celebrating`/`sleeping`/`analyzing` aliased onto `default`/`offline`/`thinking`). Mandate §1.4 satisfied.
- PNG 16/32/64 variants deferred: no PNG generation pipeline in repo; SVGs auto-scale.

### D1-06 `[E5]` entitlements matrix tests — commit `fb00fae0`
- Added `test/entitlements.test.ts` with 68 `hasAccess` matrix assertions (17 features × 4 plans) + 4 tier-limit assertions + 3 guard assertions = **75 tests**, all passing.
- **Second incident:** pre-commit hook `code-review-graph detect-changes` auto-stages all orphan work during its scan; first E5 commit (`0a5af7df`) bundled 8 unrelated files (pdf parser, debug scripts, journal import changes). Soft-reset + pathspec-locked recommit as `fb00fae0` (1 file changed, 102 insertions). User authorized. Going forward **every commit uses `git commit -m "..." -- <files>` pathspec** to bypass hook auto-staging.

### D1-07 `[E3]` delete deprecated `useSubscription` hook — commit `147b2b9f`
- Removed `useSubscription` function export + unused `useEntitlements` import from `components/context/SubscriptionContext.tsx`. Provider + context export intact for AppShell tree.
- Zero external callsites confirmed before deletion. Mandate §1.8 satisfied.

### Day 1 EOD Gate
- `npm run i18n:check` — **528 × 2 locales ✓**
- `npm test` (Vitest) — **127/127 passing ✓**
- `npm run lint` — only pre-existing warnings (no new)
- `npm run build` — **clean ✓** (after restoring orphan `lib/xlsx-adaptive-bridge.ts` from `.crlf-bak` backup file; see FOUND-WHILE-CLOSING)
- 5 commits ahead of `main@7c16158a`.

### Day 1 changelog (10-line summary)
- `[C1]` verified typo `MAIS INTUITADOS` absent (no commit, staging check deferred to user)
- `[C2]` LiveLockCard → `app.liveLock.*` (4 keys)
- `[C4]` Full /login i18n pass: hero + 4 forms + all errors/info (35 new `app.auth.*` keys)
- `[C3]` Dexter 3 new 16×16 SVG poses + 1:1 mood map
- `[E5]` Entitlements matrix test suite (17×4 features × plans, 75 tests)
- `[E3]` `useSubscription` hook export deleted
- Process lesson: pre-commit hook auto-stages; switched to `git commit -m "..." -- <files>` pathspec pattern
- Orphan pre-sprint work (NinjaTrader PDF import pipeline, ~10 files) documented in FOUND-WHILE-CLOSING, not touched
- Build restored after renaming `lib/xlsx-adaptive-bridge.ts.crlf-bak` → `.ts`
- Mandate items satisfied today: §1.3 (toggle UI switches — existing infra intact), §1.4 (Dexter 7 poses), §1.5 (pricing typo verified), §1.6 (LiveLockCard i18n), §1.8 (`useSubscription` zero callsites → deleted)

<!-- TASK ENTRIES APPENDED BELOW -->
