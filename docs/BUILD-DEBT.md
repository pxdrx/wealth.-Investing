# Build Debt — Cross-Track

Tracks global `npm run build` / `tsc --noEmit` failures that are out of scope
for the track currently observing them. Each entry names the **owning track**,
so the track that introduced the code (or owns the module) closes it on merge.

Discovered during Track C (C-02, 2026-04-20). C-02 itself is clean — these
errors pre-existed the C-02 changes.

---

## Open

### 1. `app/[locale]/layout.tsx` — missing `routing` / `Locale` exports
- **Owner:** Track B (landing/i18n)
- **Symptom:**
  ```
  app/[locale]/layout.tsx(4,10): error TS2614: Module '"@/i18n"' has no exported member 'routing'.
  app/[locale]/layout.tsx(4,24): error TS2724: '"@/i18n"' has no exported member named 'Locale'. Did you mean 'locales'?
  app/[locale]/layout.tsx(7,31): error TS7006: Parameter 'locale' implicitly has an 'any' type.
  ```
- **Root cause:** `[locale]/layout.tsx` (added in C-01 cherry-pick `ef39c05`) imports
  `routing` and `Locale` from `@/i18n`, but `i18n.ts` only exports `default` + `locales`.
  The `routing` helper is a `next-intl` v3+ pattern that was not yet wired up.
- **Fix scope:** Track B should either (a) add `routing` export using
  `defineRouting` from `next-intl/routing`, plus a `Locale` type alias, or
  (b) refactor `[locale]/layout.tsx` to use the existing default export.
- **Blocks:** `npm run build` on main after A+B+C merge.

### 2. `i18n.ts` — `getRequestConfig` return shape
- **Owner:** Track B
- **Symptom:**
  ```
  i18n.ts(8,55): error TS2322: Type 'Promise<{ messages: any; }>' is not assignable to type 'RequestConfig | Promise<RequestConfig>'.
    Property 'locale' is missing in type '{ messages: any; }' but required in type '{ locale: string; }'.
  ```
- **Root cause:** `next-intl`'s `getRequestConfig` now requires `locale` in the
  returned object. Current implementation only returns `{ messages }`.
- **Fix scope:** Add `locale` to the returned object (likely from the callback
  param) — see `next-intl` migration docs.

### 3. `components/brand/index.ts` — missing `./Mascot` module
- **Owner:** Track A (brand UI)
- **Symptom:**
  ```
  components/brand/index.ts(3,24): error TS2307: Cannot find module './Mascot' or its corresponding type declarations.
  ```
- **Root cause:** `components/brand/index.ts` re-exports from `./Mascot`, but
  `components/brand/Mascot.tsx` is not present in this worktree. Expected
  artifact of Track A's in-flight mascot work (memory entry: "Mascote Ticker —
  pixel-art blob emerald, 7 poses").
- **Fix scope:** Track A to land `components/brand/Mascot.tsx` (already
  referenced in MEMORY.md as committed, but file is absent in worktree-c's HEAD).

---

## Resolved

_(none yet)_
