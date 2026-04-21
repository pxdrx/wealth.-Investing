# Token Migration Guide

> Owner: Track A. Consumers: Track B (landing) + Track C (app).
> A-03 landed: 2026-04-20.

## What changed (A-03)

Track A consolidated two parallel design systems (Lumina Slate + landing
`--l-*` tokens) into one **Terminal** system: emerald primary
(`152 60% 30%`) + amber alert accent (`44 100% 47%`). One theme tree,
two modes (light / `.dark`). All colors flow through CSS vars with
`/<alpha-value>` support for opacity modifiers.

### Summary of deltas

| Area | Before | After |
|---|---|---|
| Primary color | `0 0% 10%` (near-black) | `152 60% 30%` (emerald) |
| Accent color | `0 0% 93%` (neutral) | `44 100% 47%` (amber) |
| Display font | `var(--font-jakarta)` | `var(--font-manrope)` |
| Radius system | `--radius-card: 22px` only | `--radius: 0.75rem` + legacy 22/24/12 preserved |
| Color scales | none exposed | `neutral`, `green`, `red`, `amber` (50..950) |
| Landing tokens | `--landing-*` (14 vars × 2 modes) | removed — use semantic tokens |
| `.landing-grid-pattern` | existed | removed — needs rewrite in B |
| PNL tokens | `--pnl-*` | unchanged |
| Shadow utilities | `shadow-landing-*` | removed — use `shadow-soft` / `shadow-soft-dark` |

---

## Track B — migration table (landing)

**Blast radius:** ~246 class occurrences across 22 files. Apply in
B-02..B-04 as you touch each file. Build will pass (Tailwind tree-shakes
unknown utilities), but affected components render unstyled until
migrated.

### Tailwind utility classes

| Legacy class | New class | Notes |
|---|---|---|
| `bg-l-bg` | `bg-background` | — |
| `bg-l-elevated` | `bg-card` | `.bg-card` global override still applies glass morphism |
| `bg-l-tertiary` | `bg-muted` | — |
| `bg-l-accent` | `bg-primary` | ⚠ now emerald (was black) |
| `bg-l-accent-secondary` | `bg-secondary` | — |
| `bg-l-warning` | `bg-amber-500` or `bg-accent` | amber scale available |
| `bg-l-danger` | `bg-destructive` | or `bg-red-500` |
| `text-l-text` | `text-foreground` | — |
| `text-l-text-secondary` | `text-muted-foreground` | — |
| `text-l-text-muted` | `text-muted-foreground` | — |
| `text-l-accent` | `text-primary` | ⚠ now emerald |
| `text-l-accent-secondary` | `text-secondary-foreground` | case-by-case |
| `text-l-warning` | `text-amber-700` (light) / `text-amber-400` (dark) | — |
| `text-l-danger` | `text-destructive` | — |
| `border-l-border` | `border-border` or just `border` | — |
| `border-l-border-strong` | `border-border border-2` | or `border-neutral-400` |
| `shadow-landing-card` | `shadow-soft` | `shadow-landing-card-hover` → `shadow-soft-dark` |
| `shadow-landing-mockup` | `shadow-soft` | — |

### CSS classes (not Tailwind utilities)

| Legacy | Status | Notes |
|---|---|---|
| `.landing-card` | ✅ kept (rewritten) | Uses `--card` / `--border`, same visual feel |
| `.landing-card-hover` | ✅ kept (rewritten) | Hover glow now emerald via `--primary` |
| `.landing-section` | ✅ kept | Pure layout utility |
| `.landing-container` | ✅ kept | Pure layout utility |
| `.landing-grid-pattern` | ❌ removed | Rewrite inline using `neutral-300` or `border` |

### Migration steps for Track B

1. Pull `feat/track-a-brand` (or wait for merge to `main`).
2. Run `npm install && npm run build` to verify no other breakage.
3. Grep each landing file for `bg-l-|text-l-|border-l-|shadow-landing-`.
4. Swap per the tables above.
5. Review in both light and dark modes at `/`, `/blog`, `/changelog`,
   `/manifesto`, `/academy`, `/features/*`.

---

## Track C — visual impact without class changes

**No class renames needed**, but Track C inherits a new look because
semantic tokens changed values. Test these flows after pulling A-03:

### What changes visually for C

- **Primary buttons and active states → emerald green** (were near-black
  in Lumina Slate). Affects every `bg-primary` / `text-primary` / `ring`
  usage across `/app/**`.
- **Headings (h1/h2/h3) → Manrope** (was Plus Jakarta via
  `theme('fontFamily.display')`). Subtle weight/shape shift.
- **Muted foreground slightly cooler** (220 9% 40% vs 0 0% 36%).
- **Border/input slightly blue-tinted** (220 13% 88% vs 0 0% 82%).
- **Dark background** is now `220 8% 7%` (slight blue tint) vs pure
  `0 0% 4%` — warmer feel, better for long sessions.

### What's preserved for C

- `--radius-card: 22px`, `--radius-modal: 24px`, `--radius-input: 12px`
  still exist. Existing cards, modals, inputs keep their geometry.
- Glass morphism on `.bg-card` still applies.
- All PNL tokens (`--pnl-positive`, `--pnl-cell-win`, etc) unchanged.
- `CalendarPnl` (uses `.landing-card`) still renders — shim rewritten
  to use semantic tokens.
- `.input-ios`, `.kpi-value`, `.metric-value`, mobile scale reduction
  all unchanged.

### Actions for Track C

1. Pull A-03 (or wait for merge to `main`).
2. `npm install && npm run build`.
3. Smoke test `/app/dashboard`, `/app/journal`, `/app/calendar`,
   `/app/settings`, both light and dark.
4. If a primary button feels wrong in the new emerald context, open
   an ADR before re-skinning — don't revert semantic tokens.

### Future C tasks (not part of A-03)

- **C-12+:** Progressive migration of existing cards/modals from
  legacy 22/24/12px radii to the new `--radius` (0.75rem) scale.
  Not urgent — legacy tokens are first-class until we choose to retire.

---

## How to add new tokens

1. Add CSS var to `:root` + `.dark` in `app/globals.css`.
2. Expose as Tailwind color in `tailwind.config.ts` using
   `hsl(var(--your-token) / <alpha-value>)`.
3. Update this doc with the new entry.
4. If the token replaces an older one, add a migration row.

## Breaking changes after A-03 merges to main

- `bg-l-*`, `text-l-*`, `border-l-*`, `shadow-landing-*` utilities no
  longer resolve (Tailwind silently drops unknown classes).
- `.landing-grid-pattern` no longer exists.
- `--landing-*` CSS variables no longer defined. → **See A-08 below — shim added, deprecation map published.**

All other tokens remain 1:1 compatible.

---

## A-08 — landing-* deprecation map

### Current state

A-03 deleted the `--landing-*` variable definitions from `app/globals.css`
and removed the companion `landing-*` keys from `tailwind.config.ts`.
But ~458 call sites across Tracks B (landing) and C (calendar, backtest)
still reference `var(--landing-*)` inline. Without definitions, those
vars resolved to their CSS fallback (`unset` / initial), which produced
silent visual regressions on landing pages.

### What A-08 does

A-08 adds a **deprecation shim** in `app/globals.css` `:root` and `.dark`:
every legacy `--landing-*` name is re-declared as an alias pointing to
the canonical Terminal token it should have been using. Existing code
keeps rendering; new code must use the canonical token on the right.

**The shim is temporary.** It exists so Track B can migrate the 458 call
sites incrementally (B-02 through B-04) without breaking the landing
surface in between. The entire block is deleted in the Track A close-out
PR (A-11). Adding a new `var(--landing-*)` reference after A-08 is a
regression — lint for it if Track B gets a reviewer bot.

### Full alias table (light + dark)

| Legacy `--landing-*`       | Canonical replacement        | Notes |
|----------------------------|------------------------------|-------|
| `--landing-bg`             | `--background`               | Base surface |
| `--landing-bg-elevated`    | `--card`                     | Elevated surface (cards, modals) |
| `--landing-bg-tertiary`    | `--secondary`                | Tertiary surface / muted fill |
| `--landing-elevated`       | `--card`                     | Duplicate of `bg-elevated` in legacy usage |
| `--landing-border`         | `--border`                   | Standard border |
| `--landing-border-strong`  | hardcoded stronger neutral   | Slightly darker than `--border`; no exact canonical equiv |
| `--landing-text`           | `--foreground`               | Body text |
| `--landing-text-secondary` | `--secondary-foreground`     | Secondary text |
| `--landing-text-muted`     | `--muted-foreground`         | Muted text |
| `--landing-accent`         | `--primary`                  | Emerald execution |
| `--landing-accent-secondary` | `--accent`                 | Amber alert accent |
| `--landing-accent-warning` | `--warning`                  | Warning (same palette as accent) |
| `--landing-accent-danger`  | `--destructive`              | Destructive / danger |
| `--landing-grid`           | `--border`                   | Grid line color |

### Gotchas (tokens that do NOT have a direct canonical equivalent)

- **`--landing-card-shadow`** and **`--landing-card-shadow-hover`** — these
  were full `box-shadow` values, not color vars. The canonical replacement
  is Tailwind's `shadow-soft` / `dark:shadow-soft-dark` (defined in
  `tailwind.config.ts`). There is **no CSS var shim**; any remaining
  inline `box-shadow: var(--landing-card-shadow)` returns `none` and must
  be rewritten. Grep:
  ```
  grep -rn 'var(--landing-card-shadow' components/ app/
  ```

- **`--landing-border-strong`** — no exact canonical equivalent. The shim
  uses a hand-picked neutral (`220 9% 40%` light / `220 9% 60%` dark).
  Track B should migrate to `hsl(var(--muted-foreground) / 0.4)` or
  `hsl(var(--border))` depending on intent.

### Per-track migration guidance

**Track B** (owns `app/page.tsx`, `app/academy/page.tsx`, `app/blog/page.tsx`,
`app/changelog/page.tsx`, `app/manifesto/page.tsx`, `components/landing/**`):

1. Grep `var(--landing-` in the owned surface.
2. Replace each match with the canonical `var(--<replacement>)` from
   the table above (Tailwind `hsl(var(--x) / <alpha>)` works inline).
3. Prefer Tailwind utility classes where possible:
   - `bg-[hsl(var(--landing-bg))]` → `bg-background`
   - `text-[hsl(var(--landing-text))]` → `text-foreground`
   - `border-[hsl(var(--landing-border))]` → `border-border`
4. For `box-shadow: var(--landing-card-shadow*)`, switch to
   `shadow-soft dark:shadow-soft-dark`.

**Track C** (owns calendar + backtest components): a handful of usages
in `components/calendar/CalendarPnl.tsx`, `CalendarGrid.tsx`,
`DayDetailPanel.tsx`, `utils.ts`, `components/dashboard/BacktestSection.tsx`.
Migrate on the same schedule as Track C refactors touch those files.

### Acceptance (A-08)

- [x] `--landing-*` aliases declared in `:root` and `.dark` with
      deprecation comment pointing here.
- [x] Every alias resolves to a canonical Terminal token (except
      `--landing-border-strong`, documented as hand-picked).
- [x] Full mapping table published in this document.
- [x] Per-track migration steps documented.
- [x] No new `--landing-*` definitions introduced; A-03 removals stand.
- [ ] Track B migration (B-02..B-04) empties the shim of real callers.
- [ ] A-11 close-out PR deletes the shim block entirely.
