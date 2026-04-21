# MIGRATION — Track A (Brand)

Close-out migration guide for Track A — the brand track of the
parallel-track roadmap. This document is the canonical reference for
Tracks B (Landing) and C (App) on **what changed**, **what's new**,
**what's deprecated**, and **how to adopt**.

Track A scope: tailwind config, global CSS tokens, fonts, brand-layer
components (`components/brand/**`), brand microcopy (`lib/brand/**`),
favicons, manifest, and the internal `/brand` dogfood page.

---

## TL;DR

- One design system now — **Terminal**. Two modes: light (paper+ink) and
  `.dark` (CRT terminal brutalist). The "Lumina Slate" / `--l-*` /
  `--landing-*` parallel systems are gone (shimmed until Track B drains).
- Primary palette: **emerald** (`152 60% 30%`). Accent: **amber alert**
  (`44 100% 47%`). Display font: **Manrope**. Mono font: **JetBrains Mono**.
- New brand primitives, consumable via the `@/components/brand` barrel:
  `BrandMark`, `Dexter`, `UltraBadge`, `UltraLock`, `ThemeToggle`.
- New voice library in `lib/brand/voice.ts` — 48 bilingual (pt/en)
  microcopy strings across 10 namespaces.
- New favicon + web app manifest with emerald theme color.
- Internal dogfood page at `/brand` (noindex) showing every primitive.

---

## Task timeline

| Task | Title | Status |
|------|-------|--------|
| A-01 | Tokens HSL light + Terminal dark in `app/globals.css` | ✅ shipped |
| A-02 | Rewrite `BRAND.md` | ✅ shipped |
| A-03 | JetBrains Mono via `next/font`; remove Plus Jakarta | ✅ shipped |
| A-04 | `<Dexter mood=... />` + 7 SVGs in `public/dexter/` | ✅ shipped |
| A-05 | `<BrandMark variant=... />` + favicons + manifest | ✅ shipped |
| A-06 | `<UltraBadge />` + `<UltraLock active />` | ✅ shipped |
| A-07 | `<ThemeToggle />` — Light / Terminal / System | ✅ shipped |
| A-08 | Remove duplicate `--landing-*` tokens + migration shim | ✅ shipped |
| A-09 | `voice.ts` — 48 bilingual microcopy strings | ✅ shipped |
| A-10 | Internal `/brand` dogfood page | ✅ shipped |
| A-11 | PR + this document | ✅ shipped |

---

## What's new (for Tracks B & C to adopt)

### Brand primitives — `@/components/brand`

All exports are named. The barrel also re-exports types and CVA helpers
where applicable.

#### `<BrandMark />`
Logo + wordmark. Props: `size: "base" | "lg" | "xl"`, `className`.

```tsx
import { BrandMark } from "@/components/brand";
<BrandMark size="lg" />
```

#### `<Dexter />`
Pixel-art mascot. 7 moods (`default`, `thinking`, `analyzing`,
`celebrating`, `alert`, `sleeping`, `offline`). Sizes 16 / 24 / 32 / 48.
Respects `prefers-reduced-motion` when `animated`.

```tsx
import { Dexter, DEXTER_MOODS } from "@/components/brand";
<Dexter mood="thinking" size={32} animated />
```

#### `<UltraBadge />`
Pure visual "ULTRA" marker — brutalist mono uppercase. Props: `variant`
(`solid` | `outline` | `ghost`), `size` (`sm` | `md` | `lg`),
`label?`, `icon?` (LucideIcon | null), `className`.

```tsx
import { UltraBadge } from "@/components/brand";
<UltraBadge variant="outline" size="sm" />
```

#### `<UltraLock active />`
Wrapper overlay for locked content. `active=false` = passthrough;
`active=true` = blurred children + dashed overlay + embedded
`UltraBadge` + optional CTA. Props: `active`, `label?`, `hint?`,
`cta?: { label, href?, onClick? }`, `blur?: "sm"|"md"|"lg"`.

```tsx
import { UltraLock } from "@/components/brand";
<UltraLock active={!isUltra} cta={{ label: "Ver planos", href: "/pricing" }}>
  <AdvancedReports />
</UltraLock>
```

Note: pure visual. For tier-aware gating that reads
`SubscriptionContext`, keep using `components/billing/PaywallGate.tsx`.
Those two layers coexist.

#### `<ThemeToggle />`
3-state theme selector — **Light / Terminal / System**. "Terminal" is
the brand name for the dark theme — internally maps to `setTheme("dark")`
on the existing `ThemeProvider`. Two visual variants (`segmented` default,
`icon` compact). Bilingual labels.

```tsx
import { ThemeToggle } from "@/components/brand";
<ThemeToggle />                            // segmented, pt
<ThemeToggle variant="icon" locale="en" /> // icon dropdown, en
```

### Voice library — `lib/brand/voice.ts`

48 bilingual strings across 10 namespaces: `greetings`, `cta`, `loading`,
`errors`, `upgrade`, `theme`, `empty`, `success`, `confirm`,
`onboarding`, `nav`. Plus helpers: `pick()`, `getGreeting()`, `cta()`.

**Do not inline copy in components.** Import from the voice library so
personality stays consistent across Tracks B and C.

```tsx
import { voice, pick, getGreeting } from "@/lib/brand";

const greeting = getGreeting("pt");
const gateCopy = pick(voice.upgrade.ultraGate, "pt");
```

### Design tokens (`app/globals.css`)

Canonical semantic tokens: `--background`, `--foreground`, `--card`,
`--card-foreground`, `--popover`, `--popover-foreground`, `--primary`,
`--primary-foreground`, `--secondary`, `--secondary-foreground`,
`--muted`, `--muted-foreground`, `--accent`, `--accent-foreground`,
`--destructive`, `--destructive-foreground`, `--success`, `--warning`,
`--border`, `--input`, `--input-bg`, `--ring`.

Domain tokens (kept, not duplicative): `--pnl-*` family.

Typography: `--tracking-tight`, `--tracking-tighter`, `--leading-*`,
`--font-weight-heading` (700), `--font-weight-display` (800).

Radius: `--radius` (0.75rem base) plus legacy `--radius-card` (22px),
`--radius-modal` (24px), `--radius-input` (12px).

### Tailwind additions (`tailwind.config.ts`)

Color scales: `neutral`, `green`, `red`, `amber` (50..950) — use for
illustrations / static surfaces where a semantic token doesn't fit.

Fonts: `sans` (Inter), `display` (Manrope), `headline` (Manrope),
`mono` (JetBrains Mono).

Shadows: `shadow-soft` (light mode), `shadow-soft-dark` (dark). Replaces
removed `shadow-landing-*` utilities.

Plugin: `tailwindcss-animate` (Framer-Motion-adjacent keyframe support).

### Public assets

- `public/favicon.ico`, `favicon-16.png`, `favicon-32.png`,
  `favicon-192.png`, `favicon-512.png`, `apple-touch-icon.png`,
  `icon-mask.png`, `favicon.svg`
- `public/manifest.webmanifest` (PWA) — theme color `#2DB469`
  (emerald primary)
- `public/dexter/*.svg` — 7 mood SVGs, pixel-art

### Internal routes

- `/brand` — dogfood showcase for every brand primitive (noindex, nofollow)

---

## What's deprecated

### `--landing-*` CSS variables

**Status:** SHIMMED in `app/globals.css` `:root` and `.dark`. Every
legacy name is aliased to its canonical Terminal token. Shim exists only
so Tracks B and C can drain the ~458 call sites incrementally without
breaking the landing surface in between.

**Canonical mapping, deprecation notes, and per-track steps:**
see [`docs/TOKEN-MIGRATION.md`](./TOKEN-MIGRATION.md) §"A-08 — landing-*
deprecation map".

**Removal plan:** the shim block is deleted in a follow-up PR after
Track B's B-02..B-04 migrations finish. Do not introduce new
`var(--landing-*)` references.

### `shadow-landing-*` utilities

Removed. Use `shadow-soft dark:shadow-soft-dark`.

### `.landing-grid-pattern` class

Removed. Rewrite inline using `neutral-300` or `border` semantic token.

### `.landing-card`, `.landing-card-hover`, `.landing-section`, `.landing-container`

**Kept.** Rewritten in A-03 to use semantic tokens under the hood. Safe
to keep using, though semantic Tailwind utilities are preferred for new
code.

### `Plus_Jakarta_Sans` display font

Removed. Use `font-display` (Manrope) via Tailwind or `--font-manrope`
via CSS var.

### `components/theme-toggle.tsx` (legacy dropdown)

**Coexists.** Still functional. Migrate to `@/components/brand#ThemeToggle`
for brand-consistent language ("Terminal" instead of "Escuro"). No
breaking change.

---

## Non-goals (explicit)

Track A did NOT do, by design:

- Refactor `components/billing/PaywallGate.tsx` to consume `UltraLock`.
  That's a Track C call.
- Wire new primitives into landing CTAs or pricing tables. That's Track B.
- Replace sidebar nav items with badged versions. That's Track C (C-02+
  entitlements work).
- Ship unit tests for `components/brand/**`. Shipped via build + lint
  + visual smoke at `/brand`, matching Track A's precedent.
- Install `next-themes`. Theme provider in `components/theme-provider.tsx`
  is the source of truth; `<ThemeToggle />` wraps it.

---

## Consumer checklist

### Track B (Landing)

- [ ] Replace `var(--landing-*)` usages with canonical tokens (see
      `TOKEN-MIGRATION.md` A-08 table). Prefer Tailwind semantic
      utilities where possible.
- [ ] Replace `box-shadow: var(--landing-card-shadow*)` with
      `shadow-soft dark:shadow-soft-dark`.
- [ ] Replace inline `<UltraBadge>` look-alikes with `@/components/brand#UltraBadge`.
- [ ] Replace hero/pricing CTAs with `voice.cta.*` strings from
      `lib/brand/voice.ts`.
- [ ] Adopt `@/components/brand#ThemeToggle` in the public navbar (optional).

### Track C (App)

- [ ] Use `@/components/brand#UltraBadge` next to feature names in the
      sidebar for Ultra-gated surfaces (C-02+ entitlements).
- [ ] Use `@/components/brand#UltraLock` as the visual wrapper inside
      `PaywallGate` (optional future refactor).
- [ ] Replace `components/theme-toggle.tsx` imports with
      `@/components/brand#ThemeToggle` in settings + header (optional).
- [ ] Migrate `components/calendar/*` and `components/dashboard/*` usages
      of `--landing-*` to canonical tokens.
- [ ] Swap inline copy strings for `voice.*` lookups where it matters
      (empty states, confirmations, nav hints).

---

## References

- [`BRAND.md`](../BRAND.md) — brand system, voice, palette, Dexter moods,
  Ultra primitives, ThemeToggle
- [`docs/TOKEN-MIGRATION.md`](./TOKEN-MIGRATION.md) — A-03 deltas + A-08
  landing-* deprecation map
- [`docs/TRACK-ROADMAP.md`](./TRACK-ROADMAP.md) — full roadmap, all three
  tracks
- [`docs/TRACK-COORDINATION.md`](./TRACK-COORDINATION.md) — ownership
  matrix + contract files
- `/brand` route — internal dogfood page

---

*Última atualização: Abril 2026 (A-11 close-out)*
