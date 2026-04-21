# Build Debt — Cross-Track

Tracks global `npm run build` / `tsc --noEmit` failures that are out of scope
for the track currently observing them. Each entry names the **owning track**,
so the track that introduced the code (or owns the module) closes it on merge.

Discovered during Track C (C-02, 2026-04-20). C-02 itself is clean — these
errors pre-existed the C-02 changes.

---

## Open

_(none)_

---

## Resolved

### 1. `app/[locale]/layout.tsx` — missing `routing` / `Locale` exports ✅
- **Owner:** Track B (landing/i18n)
- **Resolution:** `i18n.ts:10-14` now exports `routing` (built via
  `defineRouting` from `next-intl/routing`) and `Locale` type alias. The
  `[locale]/layout.tsx` import compiles cleanly.

### 2. `i18n.ts` — `getRequestConfig` return shape ✅
- **Owner:** Track B
- **Resolution:** `i18n.ts:17-23` returns `{ locale, messages }` — `locale` is
  derived from `await requestLocale` and validated against the `locales` tuple.

### 3. `components/brand/index.ts` — missing `./Mascot` module ✅
- **Owner:** Track A (brand UI)
- **Resolution:** Track A shipped `Dexter` in place of the original Mascot
  concept; the barrel exports it at `components/brand/index.ts:4`
  (`Dexter`, `DEXTER_MOODS`, `DexterMood`, `DexterProps`). `TodayMatters.tsx`
  now consumes `<Dexter mood={mood} size={48} animated />` directly.
  `docs/NEEDS-FROM-A.md` records the same resolution (2026-04-21).
