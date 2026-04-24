# CLOSEOUT-PLAN — wealth.Investing Closeout Sprint

> Plan produced per §6 of `CLAUDE-CODE-BRIEFING.md`. Stop-and-wait for user approval before any code execution.
>
> **Mode:** ultrathink / plan. **No production code will be written until user responds "go" / "approved".**
>
> **Branch strategy (pending confirmation):** `closeout/sprint-final` off `main`. Briefing §0.0 says base might be `claude/fix-language-persistence-RTG5f` — confirm with user before branching.

---

## 1. Inventory Report (ran grep/find; snapshot 2026-04-23)

### 1.1 `useSubscription` callsites
- **Status:** effectively consolidated already (commit `d9a76d4` landed E1–E4 for entitlements).
- Only references in repo:
  - `components/context/SubscriptionContext.tsx:130` — export itself (hook declaration).
  - `components/layout/AppShell.tsx:6` — imports `SubscriptionProvider` (provider, not hook call).
  - `hooks/use-entitlements.ts:4` — imports `SubscriptionContext` (internal wiring).
- **No external callsites using `useSubscription()`.** Mandate §1.8 already satisfied. E3/E4 reduce to a verification + deletion of the now-unused `useSubscription` export (provider stays).
- Note: `SubscriptionBadge` component is separate (UI badge, not tier logic) — imports in `settings/page.tsx`, `Navbar.tsx`, `AppHeader.tsx`, `AppSidebar.tsx`. Keep.

### 1.2 `--landing-*` CSS shim consumers
- **28 TS/TSX files** consume `--landing-*` vars + `app/globals.css` defines shim.
- Files:
  - Landing tree (expected, low priority if landing is "done"): `app/academy/page.tsx`, `app/changelog/page.tsx`, `components/landing/{AnnouncementBar,BlogContent,CustomerStories,Footer,JournalMockup,Logo,MockupDashboard,Navbar,NavModals}.tsx`, `components/landing/feature-pages/**` (13 files).
  - **Authenticated tree (must migrate):** `components/calendar/{CalendarGrid,CalendarPnl,DayDetailPanel,utils}.ts(x)`, `components/dashboard/BacktestSection.tsx`.
- **Shim file:** `app/globals.css` lines 43–62 (10+ landing vars aliased to product tokens).
- Scope decision (proposed): migrate only the 5 authenticated-tree files (calendar + dashboard) during H4. Leave landing-tree consumers + shim in place for this sprint — landing is out-of-scope per §0.0. Delete shim in follow-up sprint. **Open question → user.**

### 1.3 `messages/pt.json` / `messages/en.json`
- Both files exist, sizes: `pt.json` 34307 bytes, `en.json` 33131 bytes.
- `npm run i18n:check` reportedly green @ 566 keys × 2 locales (briefing §0.0).
- Parity test: `scripts/check-i18n-parity.mjs` wired into `package.json`. Do not duplicate.

### 1.4 Dexter poses in `public/dexter/`
- Present: `alert.svg`, `default.svg`, `offline.svg`, `thinking.svg`, `index.html` (demo).
- **Missing (per briefing §5 and Mandate §1.4):** `celebrating.svg`, `sleeping.svg`, `analyzing.svg`.
- PNG variants (16/32/64) for all 7 poses: absent for existing 4 and missing 3 → generate for all 7 during C3.
- `lib/voice.ts` does not currently map pose enum → asset. Map to be added.

### 1.5 Hardcoded PT heuristic per authenticated route
Rough counts via `>[A-ZÁ]…<` JSX text regex (noise included):
| Route | Literal heuristic | Notes |
|---|---|---|
| `app/app/dashboard` | 0 hits | AppSidebar partly wired; dashboard widgets still hold narrative PT per §2 I2. Re-scan per-widget during I2. |
| `app/app/journal` | ~2 | Bulk lives in `components/journal/**`; calendar day labels + session map (Tokyo/London/NY). |
| `app/app/mentor` | ~19 | Full route pass needed (I4). |
| `app/app/prop` | ~4 | KPI labels, firm grouping, status chips. |
| `app/app/chart` | ~2 | Ticker chip copy (Ouro, BTC, etc.). |
| `app/app/backtest` | ~1 | Tabs + empty state. |
| `app/app/macro` | ~6 | Multiple sub-widgets; counts understated. |
| `app/app/dexter` | ~7 | Chat ticker, quick commands, coach tabs. |
| `app/app/settings` | ~17 | Perfil, Assinatura ("Active"), Mentor, Preferências. |
| `app/app/pricing` | ~1 | Title `Planos` + subtitle (already PT) + feature lists in `PricingCards`. |
| `app/app/admin` | ~13 | **Open question:** translate or leave PT? |

Heuristic **undercounts** (attributes, conditional strings, `t()` wrappers already in place not excluded). Plan: replace with per-component AST-aware audit during each I# task.

### 1.6 Verified artifacts
- `lib/entitlements.ts` ✅ exists.
- `hooks/use-entitlements.ts` ✅ exists.
- `scripts/check-i18n-parity.mjs` ✅ wired (`i18n:check`).
- `npm` scripts: `dev`, `build`, `lint`, `test` (Vitest), `i18n:check`.
- **LiveLockCard** at `components/live/LiveLockCard.tsx` (not `components/widgets/` as briefing suggests). Fully hardcoded PT — confirmed.
- **Pricing typo `MAIS INTUITADOS`:** not found in current source. Either already fixed or lives in a file not caught by grep. Badge currently reads `"Mais popular"` in `components/billing/PricingCards.tsx:48`. → open question #1.
- **Auditoria file path:** briefing §10.2 cites `auditoria/Auditoria v2 — pós-implementação.html`. Actual file in repo root: `Auditoria wealth.Investing.html`. Version "v2 — pós-implementação" **not found**. → open question.

---

## 2. Task Graph (ordered; one task = one commit)

Branch: `closeout/sprint-final`. Commit title format: `[TAG] description`.

### Day 1 — Critical surgical fixes + prep

| # | Commit | Files | Acceptance |
|---|---|---|---|
| D1-01 | `[C1] fix pricing typo / confirm copy` | `app/app/pricing/page.tsx`, `components/billing/PricingCards.tsx`, `messages/*.json` | Typo absent; badge string moved to i18n. |
| D1-02 | `[C2] i18n LiveLockCard` | `components/live/LiveLockCard.tsx`, `messages/*.json` | No PT literal; `i18n:check` green; both locales render. |
| D1-03 | `[C4] i18n /login PT+EN mix` | `app/(marketing)/login/page.tsx` (or actual path) + `messages/*.json` | No literal "SENHA"/"ENCRYPTED"; both locales render. |
| D1-04 | `[C3] Dexter 3 missing poses (SVG)` | `public/dexter/{celebrating,sleeping,analyzing}.svg` | SVGs present, crisp-edges, 16px grid. |
| D1-05 | `[C3] Dexter PNG 16/32/64 all poses + voice.ts map` | `public/dexter/*.png`, `lib/voice.ts` | All 7 poses × 3 sizes; `<Dexter mood="x" />` resolves. |
| D1-06 | `[E5] entitlements matrix tests` | `tests/entitlements.test.ts` (new) | Vitest asserts `can(feature, tier)` for free/pro/ultra across pricing matrix. |
| D1-07 | `[E3] delete unused useSubscription hook` | `components/context/SubscriptionContext.tsx` | Provider stays; hook export removed; build green. |

### Day 2 — i18n pass batch 1 (navigation + dashboard shell)

| # | Commit | Scope |
|---|---|---|
| D2-01 | `[I1] i18n AppSidebar remaining labels` | `components/layout/AppSidebar.tsx` + `messages/nav.*` (or `sidebar.*`). |
| D2-02 | `[I2] i18n Dashboard widgets` | `components/widgets/{TodayMatters,DayKpis,Timeline*}.tsx`. |
| D2-03 | `[I10a] i18n Settings page shell` | `app/app/settings/page.tsx` (shell + section headers). |
| D2-04 | `[H1] move PT/EN toggle to Settings > Preferências` | `components/settings/LanguagePreference.tsx` (new); redirect old location. |

### Day 3 — i18n pass batch 2 (journal + prop + mentor)

| # | Commit | Scope |
|---|---|---|
| D3-01 | `[I3] i18n Journal (3 views + Psicologia + Calendar day labels + Session map)` | `app/app/journal/**`, `components/journal/**`. |
| D3-02 | `[I5] i18n Prop/Contas (status chips + KPIs)` | `app/app/prop/**`. |
| D3-03 | `[I4] i18n Mentor` | `app/app/mentor/**`. |
| D3-04 | `[I11] i18n Pricing feature lists` | `components/billing/PricingCards.tsx`. |

### Day 4 — i18n pass batch 3 + HIGH

| # | Commit | Scope |
|---|---|---|
| D4-01 | `[I6] i18n Chart ticker labels` | `app/app/chart/**`. |
| D4-02 | `[I7] i18n Backtest` | `app/app/backtest/**`. |
| D4-03 | `[I8] i18n Macro Terminal (9 panels)` | `app/app/macro/**`. |
| D4-04 | `[I9] i18n Dexter (Chat, Coach, Analyst)` | `app/app/dexter/**`. |
| D4-05 | `[I10b] i18n Settings Perfil/Assinatura/Mentor/Preferências` | `app/app/settings/**`. |
| D4-06 | `[H3] fix Journal drawdown chart axis sign` | `components/journal/DrawdownChart.tsx`. |
| D4-07 | `[H4a] migrate authenticated-tree `--landing-*` consumers` | 5 files under `components/calendar/**` + `components/dashboard/BacktestSection.tsx`. Shim stays this sprint. |
| D4-08 | `[H2] remove "Powered by Claude AI + TradingEconomics Data" footer` (pending user yes) | macro footer file. |

### Day 5 — MEDIUM + polish + verification

| # | Commit | Scope |
|---|---|---|
| D5-01 | `[M1] Settings "Active" status locale-aware` | Stripe status map helper + Settings. |
| D5-02 | `[M2] Contas vs Prop nomenclature decision applied` | Pending user choice. |
| D5-03 | `[M4] Dexter /command hint tooltip` | `components/dexter/CommandHint.tsx` (new). |
| D5-04 | `[M3] document TradingView branding constraint` | `docs/licensing.md` (note only, no code). |
| D5-05 | `[DOD] final verification (build + lint + test + i18n:check + manual QA script)` | No code; CI pass recorded. |

Per-commit gate: `npm run build && npm run lint && npm run test && npm run i18n:check`.

Scope-creep bugs → `handoff/FOUND-WHILE-CLOSING.md`. Running log → `handoff/CLOSEOUT-LOG.md`.

---

## 3. Risk Register (7 risks)

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | **Stripe webhook breakage from entitlements tests (E5).** | Low | High | E3 already shipped; E5 is read-only tests. No webhook signature logic altered. Pre-commit: full `npm test`; manual webhook replay via Stripe CLI against staging before merge. Rollback: `git revert` of test commit (no runtime impact). |
| R2 | **Hydration mismatch from locale switching (SSR vs CSR boundary).** | Med | High | `IntlProviderSafe` already tolerates missing keys; use `next-intl` formatters consistently (§4.5). No raw `toLocaleString`. Verify each new i18n commit in both locales via `/login` → switch → refresh. Rollback: revert commit; `IntlProviderSafe` will fall back to `namespace.key` strings. |
| R3 | **Missing EN translations blocking build.** | Med | Med | Stub EN as `"[TODO: EN] {PT}"` per §4.4. `i18n:check` enforces parity — build only breaks if keys diverge, not if EN is stubbed. Maintain TODO list in `handoff/CLOSEOUT-LOG.md`; batch EN refinement on D5. Rollback: revert single commit. |
| R4 | **LocalStorage key collision on language persistence.** | Low | Med | DB-backed persistence already landed (`profiles.preferred_locale` + `updateMyPreferredLocale` + `syncLocaleFromProfile` in `563a95c`). Do NOT touch. For H1 (toggle move), the component reads DB state — localStorage is no longer source of truth. Use `activeAccountId`-style namespacing if any transient key needed. Rollback: revert H1 commit. |
| R5 | **SSR/CSR locale divergence on first paint.** | Med | Med | `AuthGate.syncLocaleFromProfile()` already reconciles cookie ↔ DB. Ensure every new `t()` call sits inside a client boundary or is wrapped by `NextIntlClientProvider`. Snapshot-test one server component and one client component per locale. Rollback: revert commit; `IntlProviderSafe` keeps UI rendered (shows key paths instead of strings). |
| R6 | **Dexter pose asset regression (voice.ts map type drift).** | Low | Low | Keep pose enum as const union; add type-level exhaustiveness test (Vitest + ts type assertion). Rollback: remove new pose keys from map. |
| R7 | **`--landing-*` shim removal in authenticated tree breaks calendar visuals.** | Med | Med | Visual regression risk. Plan scopes shim removal to authenticated-tree consumers only (5 files). Dev-server smoke + screenshot diff before/after per file. Shim in `globals.css` stays this sprint. Rollback: re-add `var(--landing-*)` reference or `git revert`. |

---

## 4. Open Questions for User (answer before "go")

1. **`MAIS INTUITADOS` typo:** not present in current source (grep clean; `PricingCards.tsx:48` reads `"Mais popular"`). Was it already fixed in a recent commit, or does it live in a file I missed? If already fixed, skip C1 replacement and close Mandate §1.5. If still needs change, give desired copy (`MAIS INDICADOS`? `MAIS POPULAR`? other?).
2. **Admin route (`/app/admin`) translation:** translate to EN or leave PT-only (internal tool)?
3. **"Powered by Claude AI + TradingEconomics Data" macro footer:** remove or keep?
4. **"Contas" vs "Prop" nomenclature:** choose one for sidebar/routes/labels.
5. **PT/EN toggle:** move *from sidebar to settings* (remove from sidebar) OR *appear in both*?
6. **`--landing-*` shim:** OK to scope removal to authenticated-tree files only (calendar + dashboard backtest section) this sprint, leaving landing-tree + shim definition for a follow-up? Or full removal required inside this sprint?
7. **Base branch confirmation:** branch `closeout/sprint-final` off current `main` (7c16158a) or wait for `claude/fix-language-persistence-RTG5f` to merge first?
8. **Auditoria doc version:** briefing §10 references `auditoria/Auditoria v2 — pós-implementação.html`. Only `Auditoria wealth.Investing.html` found at repo root. Is that the same doc (renamed/moved)?
9. **Dexter 3 missing poses — asset source:** hand-drawn SVG to match existing 4? Reuse the "claude-design 16x16 phosphor sprites" per commit `4eadb81`? Or new spec?
10. **`public/dexter` PNG variants (16/32/64):** required for the existing 4 poses too, or only for the 3 new ones?

---

## 5. Rollback Plan (per risky task)

- **E3 `useSubscription` deletion (D1-07):** `git revert <sha>`. Hook export re-added; provider unaffected (provider kept throughout).
- **E5 entitlements matrix tests (D1-06):** `git revert <sha>`. Zero runtime impact.
- **I1–I11 i18n pass (D2-01 through D4-05):** each commit is single-component / single-route. Revert offending commit; `IntlProviderSafe` renders `namespace.key` fallback; no crash. Worst case: per-commit `git revert` is safe at any point.
- **H1 PT/EN toggle move (D2-04):** revert commit; old sidebar location restored. DB-backed persistence untouched (locale survives regardless of UI location).
- **H4a `--landing-*` migration in authenticated tree (D4-07):** per-file revert. Shim still defined in `globals.css`, so re-reverting a single file immediately restores behavior.
- **C3 Dexter poses + map (D1-04/05):** revert voice.ts map + delete new assets. Existing 4 poses unaffected; `<Dexter mood="celebrating" />` falls back to `default` if map lookup misses.
- **Day-level bail-out:** if any day's batch destabilizes build, `git reset --hard origin/closeout/sprint-final~N` where N = commits of that day; fall back to prior night's push.

---

## 6. Process Rules Acknowledged (from §7)

- One task = one commit. `[TAG] message` format.
- Per-commit gate: build + lint + test + `i18n:check` all green.
- Daily push at EOD + 10-line changelog in session.
- Running doc `handoff/CLOSEOUT-LOG.md` appended per task.
- Scope creep → `handoff/FOUND-WHILE-CLOSING.md` only.
- No refactors beyond authorized entitlements consolidation (and that one is essentially already done).
- No new hex colors.
- Stuck > 15 min → stop + ask.

---

## 7. Definition of Done (to revisit at final commit)

- Mandate §1.1 through §1.9 verified item-by-item.
- `npm run build && npm run lint && npm run test && npm run i18n:check` — all green.
- Manual smoke: login → dashboard → journal → mentor → prop → chart → backtest → macro → dexter → settings → pricing — in both PT and EN.
- `handoff/CLOSEOUT-LOG.md` covers every commit.
- Open questions §4 all answered before closing PR.

---

**STOP.** Awaiting user approval / revisions / answers to §4 before executing any task.
