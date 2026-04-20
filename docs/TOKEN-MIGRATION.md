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
- `--landing-*` CSS variables no longer defined.

All other tokens remain 1:1 compatible.
